import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

setDefaultTimeout(60 * 1000);
const FRONTEND_URL = 'http://localhost:3004';
const API_URL = 'http://localhost:3005/api';

let browser: Browser;
let page: Page;
let currentClassId: string = '';
let pastClassId: string = '';

let createdClassIds: string[] = [];
let createdStudentCPFs: string[] = [];

const COLORS = {
  'Vermelho': 'rgb(239, 68, 68)',
  'Verde': 'rgb(34, 197, 94)',
  'Amarelo': 'rgb(234, 179, 8)',
};

async function navigateToTab(targetPageName: string) {
  // Garantir que estamos na página principal
  if (page.url() !== FRONTEND_URL && !page.url().includes('localhost:3004')) {
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0', timeout: 30000 });
  }

  const tabMap: Record<string, string> = { "Avaliações": "Evaluations", "Students": "Students" };
  const targetText = tabMap[targetPageName] || targetPageName;

  // Esperar a página carregar completamente antes de procurar botões
  await page.waitForSelector('.tab-navigation', { timeout: 10000 });
  await page.waitForSelector('button, a', { timeout: 10000 });
  
  // Usar waitForSelector com xpath ou texto para encontrar o botão específico
  const clickedButton = await page.evaluate((text) => {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    const button = buttons.find(btn => btn.textContent?.includes(text));
    if (button) {
      (button as HTMLElement).click();
      return true;
    }
    return false;
  }, targetText);

  if (!clickedButton) {
    throw new Error(`Aba ${targetText} não encontrada.`);
  }

  // Aguardar o conteúdo da aba aparecer
  if (targetText === 'Evaluations') {
    await page.waitForFunction(
      () => {
        const headings = Array.from(document.querySelectorAll('h3'));
        return headings.some(h => h.textContent?.includes('Evaluations'));
      },
      { timeout: 10000 }
    );
  } else if (targetText === 'Students') {
    await page.waitForSelector('table', { timeout: 10000 });
  }
  
  // Aguardar um pouco para garantir que a transição está completa
  await new Promise(resolve => setTimeout(resolve, 500));
}

Before({ tags: '@student-status-color' }, async function () {

  createdClassIds = [];
  createdStudentCPFs = [];
  currentClassId = '';
  pastClassId = '';

  browser = await launch({ 
    headless: false, 
    slowMo: 10,
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });
});

After({ tags: '@student-status-color' }, async function () {

  if (createdStudentCPFs.length > 0) {
    await Promise.all(createdStudentCPFs.map(cpf => 
        apiRequest('DELETE', `/students/${cpf}`)
    ));
  }
  if (createdClassIds.length > 0) {
    await Promise.all(createdClassIds.map(id => 
        apiRequest('DELETE', `/classes/${id}`)
    ));
  }
  const filePath = path.resolve(__dirname, 'temp_grades_test.csv');
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  if (browser) await browser.close();
});

async function apiRequest(method: string, endpoint: string, body?: any) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok && method === 'POST') return null;
    if (!response.ok && method === 'DELETE') return null; 
    
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (e) {
    return null;
  }
}

// SETUP DA TURMA
Given('que o sistema possui a turma {string}', async function (classString: string) {
  const parts = classString.split('-');
  const semester = parseInt(parts.pop() || '1');
  const year = parseInt(parts.pop() || '2025');
  const topic = parts.join('-');

  const newClass = await apiRequest('POST', '/classes', {
    topic, year, semester,
    especificacaoDoCalculoDaMedia: { 
        pesosDosConceitos: [['MA', 10], ['MPA', 7], ['MANA', 4]],
        pesosDasMetas: [['Requirements', 1], ['Configuration Management', 1], ['Project Management', 1], ['Design', 1], ['Tests', 1], ['Refactoring', 1]]
    }
  });

  if (newClass && newClass.id) {
    currentClassId = newClass.id;
    createdClassIds.push(newClass.id);
  } else {
    const classes = await apiRequest('GET', '/classes') as any[];
    const existing = classes.find((c: any) => c.topic === topic && c.year === year && c.semester === semester);
    
    if (!existing) throw new Error(`Não foi possível criar nem encontrar a turma ${classString}.`);
    
    currentClassId = existing.id;
  }
});

Given('que houve uma turma passada {string}', async function (classString: string) {
    const parts = classString.split('-');
    const semester = parseInt(parts.pop() || '1');
    const year = parseInt(parts.pop() || '2024');
    const topic = parts.join('-');

    const newClass = await apiRequest('POST', '/classes', {
        topic, year, semester,
        especificacaoDoCalculoDaMedia: { 
            pesosDosConceitos: [['MA', 10], ['MPA', 7], ['MANA', 4]],
            pesosDasMetas: [['Requirements', 1], ['Configuration Management', 1], ['Project Management', 1], ['Design', 1], ['Tests', 1], ['Refactoring', 1]]
        }
    });

    if (newClass && newClass.id) {
        pastClassId = newClass.id;
        createdClassIds.push(newClass.id);
    }
});

// SETUP DE ALUNOS
Given('os seguintes alunos estão matriculados nesta turma:', async function (dataTable: any) {
  const students = dataTable.hashes();
  for (const s of students) {
    const newStudent = await apiRequest('POST', '/students', { name: s.nome, cpf: s.cpf, email: s.email });
    
    if (newStudent && newStudent.name) {
        createdStudentCPFs.push(s.cpf);
    }

    await apiRequest('POST', `/classes/${currentClassId}/enroll`, { studentCPF: s.cpf });
  }
});

Given('o aluno {string} \\(CPF {string}) foi reprovado nessa turma passada', async function (name: string, cpf: string) {
    const newStudent = await apiRequest('POST', '/students', { name, cpf, email: 'reprovado@teste.com' });
    if (newStudent && newStudent.name) createdStudentCPFs.push(cpf);

    // Usa a turma passada guardada na variável pastClassId
    if (pastClassId) {
        await apiRequest('POST', `/classes/${pastClassId}/enroll`, { studentCPF: cpf });
        // Dar notas MANA em todas as avaliações para garantir reprovação (média < 5.0)
        const goals = ['Requirements', 'Configuration Management', 'Project Management', 'Design', 'Tests', 'Refactoring']; 
        for (const goal of goals) {
            await apiRequest('PUT', `/classes/${pastClassId}/enrollments/${cpf}/evaluation`, { goal, grade: 'MANA' });
        }
    }
});


// NAVEGAÇÃO UI
Given('estou na página de {string}', async function (pageName: string) {
  await navigateToTab(pageName);
});

Given('eu vou para página de {string}', async function (pageName: string) {
  await navigateToTab(pageName);
});

// SELEÇÃO DE TURMA
Given('eu escolho a turma {string}', async function (classString: string) {
  const selector = '#classSelect, #class-select';
  await page.waitForSelector(selector);

  const parts = classString.split('-');
  const semester = parts.pop();
  const year = parts.pop();
  const topic = parts.join('-');
  const expectedUIText = `${topic} (${year}/${semester})`;

  try {
      await page.waitForFunction(
          (selector, text) => {
              const select = document.querySelector(selector) as HTMLSelectElement;
              if (!select) return false;
              return Array.from(select.options).some(opt => opt.text.includes(text));
          },
          { timeout: 5000 },
          selector,
          expectedUIText
      );
  } catch (e) {
      console.log("Opção não apareceu. Tentando reload...");
      await page.reload({ waitUntil: 'networkidle0' });
      await page.waitForSelector(selector);
  }

  const success = await page.evaluate((selector, text) => {
    const select = document.querySelector(selector) as HTMLSelectElement;
    const options = Array.from(select.options);
    const option = options.find(opt => opt.text.includes(text));
    if (option) {
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }, selector, expectedUIText);

  if (!success) throw new Error(`Turma "${expectedUIText}" não encontrada.`);
  
  await new Promise(r => setTimeout(r, 1000));
});


// IMPORTAÇÃO E UPLOAD
When('eu importo uma planilha de notas com o seguinte conteúdo:', async function (dataTable: any) {
  const data = dataTable.hashes();
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) csvRows.push(headers.map(h => row[h]).join(','));
  
  const filePath = path.resolve(__dirname, 'temp_grades_test.csv');
  fs.writeFileSync(filePath, csvRows.join('\n'));

  const fileInput = await page.waitForSelector('input[type="file"]');
  if (fileInput) await fileInput.uploadFile(filePath);

  const btns = await page.$$('button');
  for (const b of btns) {
      if (await page.evaluate(el => el.textContent?.includes('Continuar'), b)) {
          await b.click();
          break;
      }
  }

  await page.waitForSelector('h4', { timeout: 10000 }); 
  for (const header of headers) {
    await page.evaluate((h) => {
        const h4s = Array.from(document.querySelectorAll('h4'));
        const target = h4s.find(el => el.textContent?.trim() === h);
        if (target && target.nextElementSibling) {
            const select = target.nextElementSibling as HTMLSelectElement;
            const opts = Array.from(select.options);
            const match = opts.find(o => o.value === h || o.text === h);
            if (match) {
                select.value = match.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }, header);
  }

  const sendBtns = await page.$$('button');
  for (const b of sendBtns) {
      if (await page.evaluate(el => el.textContent?.includes('Enviar'), b)) {
          await b.click();
          break;
      }
  }
  
  await new Promise(r => setTimeout(r, 2000));
});

// VERIFICAÇÃO VISUAL
Then('vejo se cor de da borda de {string} está {string}', async function (name: string, colorName: string) {
  const expectedRGB = COLORS[colorName as keyof typeof COLORS];
  if (!expectedRGB) throw new Error(`Cor ${colorName} desconhecida.`);

  await page.waitForSelector('table tbody tr');

  const result = await page.evaluate((studentName) => {
    const rows = Array.from(document.querySelectorAll('table tbody tr'));
    const row = rows.find(r => r.textContent?.includes(studentName));
    return row ? window.getComputedStyle(row).borderLeftColor : null;
  }, name);

  if (!result) throw new Error(`Aluno ${name} não encontrado na tabela.`);
  
  expect(result).toBe(expectedRGB);
});