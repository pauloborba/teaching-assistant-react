import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, launch, Page } from 'puppeteer';
import expect from 'expect';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';

interface TestContext {
  browser?: Browser;
  page?: Page;
  testClassId?: string;
  testStudentCPF?: string;
  testStudentName?: string;
}

const context: TestContext = {};

// ============================================
// BEFORE and AFTER HOOKS
// ============================================

Before(async function () {
  // Criar ou usar turma de teste específica
  try {
    const timestamp = Date.now();
    
    // Criar turma específica mencionada no feature file
    const classData = {
      topic: 'Engenharia de Software e Sistemas',
      year: 2025,
      semester: 2
    };
    
    // Tentar criar a turma (pode já existir)
    const classResponse = await fetch(`${serverUrl}/api/classes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(classData)
    });
    
    if (classResponse.ok) {
      const testClass = await classResponse.json();
      context.testClassId = testClass.id;
      // console.log('Created test class:', classData.topic, 'with ID:', context.testClassId);
    } else {
      // Se falhar (classe pode já existir), buscar todas as classes e encontrar a correspondente
      const getAllResponse = await fetch(`${serverUrl}/api/classes`);
      if (getAllResponse.ok) {
        const allClasses = await getAllResponse.json();
        const existingClass = allClasses.find((c: any) => 
          c.topic === classData.topic && c.year === classData.year && c.semester === classData.semester
        );
        if (existingClass) {
          context.testClassId = existingClass.id;
          // console.log('Using existing class:', classData.topic, 'with ID:', context.testClassId);
        } else {
          throw new Error('Failed to create or find test class');
        }
      } else {
        throw new Error('Failed to create class and failed to get all classes');
      }
    }
    
    if (!context.testClassId) {
      throw new Error('Class ID is undefined after creation/lookup');
    }
    
    // Criar aluno de teste aleatório
    const studentRandomId = Math.random().toString(36).substring(2, 8);
    const cpf = timestamp.toString().slice(-11);
    const studentData = {
      name: `Test Student ${studentRandomId}`,
      cpf: cpf,
      email: `test.${studentRandomId}.${timestamp}@example.com`
    };
    
    const studentResponse = await fetch(`${serverUrl}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(studentData)
    });
    
    if (!studentResponse.ok) {
      const error = await studentResponse.text();
      throw new Error(`Failed to create student: ${error}`);
    }
    
    const student = await studentResponse.json();
    context.testStudentCPF = student.cpf;
    context.testStudentName = student.name;
    // console.log('Created random test student:', context.testStudentName, 'with CPF:', context.testStudentCPF);
    
    // Matricular o aluno na turma
    const enrollResponse = await fetch(`${serverUrl}/api/classes/${context.testClassId}/enroll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentCPF: student.cpf })
    });
    
    if (!enrollResponse.ok) {
      const error = await enrollResponse.text();
      throw new Error(`Failed to enroll student: ${error}`);
    }
    
    // console.log('Enrolled student in class');
    await new Promise(resolve => setTimeout(resolve, 500));
  } catch (error) {
    // console.error('Failed to create test data:', error);
    throw error; // Re-throw to fail the test early
  }
  
  // Iniciar browser
  context.browser = await launch({
    headless: false,
    slowMo: 50
  });
  context.page = await context.browser.newPage();
  if (context.page) {
    await context.page.setViewport({ width: 1280, height: 720 });
  }
});

After(async function () {
  // Limpar aluno e turma de teste
  if (context.testStudentCPF && context.testClassId) {
    try {
      await fetch(`${serverUrl}/api/classes/${context.testClassId}/enroll/${context.testStudentCPF}`, {
        method: 'DELETE'
      });
      await fetch(`${serverUrl}/api/students/${context.testStudentCPF}`, {
        method: 'DELETE'
      });
      // console.log('Cleaned up test student');
    } catch (error) {
      // console.error('Failed to cleanup student:', error);
    }
  }
  
  // Não deletar a turma de teste pois ela pode ser reutilizada
  // A turma "Engenharia de Software e Sistemas (2025/2)" deve permanecer para outros testes
  
  // Fechar browser
  if (context.browser) {
    await context.browser.close();
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Navega até a página de Evaluations e seleciona a turma
 */
async function navigateToEvaluationsPage(page: Page, classId: string) {
  await page.goto(baseUrl);
  await page.waitForSelector('h1', { timeout: 10000 });
  
  // Procurar e clicar no link/botão de Evaluations
  const buttons = await page.$$('button, a');
  for (const button of buttons) {
    const text = await page.evaluate(el => el.textContent, button);
    if (text?.includes('Evaluations') || text?.includes('Avaliações')) {
      await button.click();
      break;
    }
  }
  
  // Aguardar o dropdown de turmas
  await page.waitForSelector('#classSelect', { timeout: 5000 });
  
  // Selecionar a turma
  await page.select('#classSelect', classId);
  
  // Aguardar a tabela de avaliações aparecer
  await page.waitForSelector('.evaluation-table-container', { timeout: 5000 });
  await page.waitForSelector('.evaluation-table', { timeout: 5000 });
}

/**
 * Configura as notas do aluno para atingir uma média específica
 */
async function setStudentGrades(classId: string, studentCPF: string, evaluations: Array<{goal: string, grade: string}>) {
  // console.log(`Setting grades for student CPF ${studentCPF} in class ${classId}`);
  
  for (const evaluation of evaluations) {
    const response = await fetch(`${serverUrl}/api/classes/${classId}/enrollments/${studentCPF}/evaluation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: evaluation.goal, grade: evaluation.grade })
    });
    
    if (!response.ok) {
      const error = await response.text();
      // console.error(`Failed to set ${evaluation.goal} = ${evaluation.grade}:`, error);
    } else {
      // console.log(`Set ${evaluation.goal} = ${evaluation.grade}`);
    }
  }
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  // console.log('Finished setting all grades');
}

/**
 * Lê a média exibida na GUI (coluna Average) para um aluno específico
 */
async function getDisplayedAverage(page: Page, studentName: string): Promise<string> {
  await page.waitForSelector('.average-cell', { timeout: 5000 });
  
  // Aguardar um pouco para o React atualizar
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const text = await page.evaluate((name) => {
    // Encontrar a linha do aluno pelo nome
    const rows = Array.from(document.querySelectorAll('.student-row'));
    const studentRow = rows.find(row => {
      const nameCell = row.querySelector('.student-name-cell');
      return nameCell?.textContent?.trim() === name;
    });
    
    if (!studentRow) {
      console.error('Student row not found for:', name);
      return '';
    }
    
    const cell = studentRow.querySelector('.average-cell');
    return cell?.textContent?.trim() || '';
  }, studentName);
  
  // console.log(`Read average from GUI for ${studentName}:`, text);
  return text;
}

/**
 * Lê a média final exibida na GUI (coluna Final Average) para um aluno específico
 */
async function getDisplayedFinalAverage(page: Page, studentName: string): Promise<string> {
  await page.waitForSelector('.final-average-cell', { timeout: 5000 });
  
  // Aguardar um pouco para o React atualizar
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const text = await page.evaluate((name) => {
    // Encontrar a linha do aluno pelo nome
    const rows = Array.from(document.querySelectorAll('.student-row'));
    const studentRow = rows.find(row => {
      const nameCell = row.querySelector('.student-name-cell');
      return nameCell?.textContent?.trim() === name;
    });
    
    if (!studentRow) {
      console.error('Student row not found for:', name);
      return '';
    }
    
    const cell = studentRow.querySelector('.final-average-cell');
    return cell?.textContent?.trim() || '';
  }, studentName);
  
  // console.log(`Read final average from GUI for ${studentName}:`, text);
  return text;
}

/**
 * Verifica se o campo de nota final está vazio/desabilitado para um aluno específico
 */
async function isFinalGradeEmpty(page: Page, studentName: string): Promise<boolean> {
  const finalValue = await page.evaluate((name) => {
    // Encontrar a linha do aluno pelo nome
    const rows = Array.from(document.querySelectorAll('.student-row'));
    const studentRow = rows.find(row => {
      const nameCell = row.querySelector('.student-name-cell');
      return nameCell?.textContent?.trim() === name;
    });
    
    if (!studentRow) {
      console.error('Student row not found for:', name);
      return '';
    }
    
    const select = studentRow.querySelector('.final-cell select') as HTMLSelectElement;
    return select?.value || '';
  }, studentName);
  
  return finalValue === '' || finalValue === '-';
}

// ============================================
// STEP DEFINITIONS
// ============================================

Given('estou na página "Evaluations" da turma {string}', async function (classReference: string) {
  const page = context.page!;
  const classId = context.testClassId;
  
  if (!classId) {
    throw new Error('Test class ID is undefined. Check Before hook execution.');
  }
  
  // console.log('Navigating to Evaluations page with class ID:', classId);
  await navigateToEvaluationsPage(page, classId);
});

Given('o estudante tem média {string} e tem nota final como {string}', async function (targetAverage: string, finalGrade: string) {
  const page = context.page!;
  const classId = context.testClassId!;
  const studentCPF = context.testStudentCPF!;
  
  const avgValue = parseFloat(targetAverage.replace(',', '.'));
  
  // Configurar notas para atingir a média desejada (todas as 6 avaliações)
  // MA=10, MPA=7, MANA=0
  let evaluations: Array<{goal: string, grade: string}> = [];
  
    // Média ~5.5: (0+7+7+7+7+7)/6 = 35/6 = 5.83
    evaluations = [
      { goal: 'Requirements', grade: 'MANA' },
      { goal: 'Configuration Management', grade: 'MPA' },
      { goal: 'Project Management', grade: 'MPA' },
      { goal: 'Design', grade: 'MA' },
      { goal: 'Tests', grade: 'MPA' },
      { goal: 'Refactoring', grade: 'MANA' },
      {goal: 'Final', grade: finalGrade }
    ];
  
  await setStudentGrades(classId, studentCPF, evaluations);
  
  // Configurar nota final se fornecida
  /*if (finalGrade) {
    console.log(`Setting final grade: ${finalGrade}`);
    const response = await fetch(`${serverUrl}/api/classes/${classId}/enrollments/${studentCPF}/evaluation`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ goal: 'Final', grade: finalGrade })
    });
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to set final grade:', error);
    } else {
      console.log('Final grade set successfully');
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }*/
  
  // console.log('Reloading page to get updated data...');
  
  // Recarregar a página completamente para forçar atualização dos dados
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Re-navegar para a página de Evaluations e selecionar a turma
  await navigateToEvaluationsPage(page, classId);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // console.log('Page reloaded and class data refreshed');
});

When('eu vejo que a média é {string}', async function (expectedAverage: string) {
  const page = context.page!;
  const classId = context.testClassId!;
  const studentCPF = context.testStudentCPF!;
  const expected = parseFloat(expectedAverage.replace(',', '.'));
  
  // Configurar notas se ainda não foram configuradas (todas as 6 avaliações)
  // MA=10, MPA=7, MANA=0
  let evaluations: Array<{goal: string, grade: string}> = [];
  
  if (expected === 5.7) {
    // Média ~5.83: (0+7+7+7+7+7)/6 = 35/6 = 5.83
    evaluations = [
      { goal: 'Requirements', grade: 'MPA' },
      { goal: 'Configuration Management', grade: 'MA' },
      { goal: 'Project Management', grade: 'MA' },
      { goal: 'Design', grade: 'MANA' },
      { goal: 'Tests', grade: 'MANA' },
      { goal: 'Refactoring', grade: 'MPA' }
    ];
  } else if (expected === 7.8) {
    // Média ~8.0: (10+7+7+10+7+7)/6 = 48/6 = 8.0
    evaluations = [
      { goal: 'Requirements', grade: 'MA' },
      { goal: 'Configuration Management', grade: 'MA' },
      { goal: 'Project Management', grade: 'MA' },
      { goal: 'Design', grade: 'MANA' },
      { goal: 'Tests', grade: 'MPA' },
      { goal: 'Refactoring', grade: 'MA' }
    ];
  }
  
  await setStudentGrades(classId, studentCPF, evaluations);
  
  // console.log('Reloading page to get updated data...');
  
  // Recarregar a página completamente para forçar atualização dos dados
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Re-navegar para a página de Evaluations e selecionar a turma
  await navigateToEvaluationsPage(page, classId);
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Verificar a média exibida
  const studentName = context.testStudentName!;
  const displayedText = await getDisplayedAverage(page, studentName);
  // console.log('Expected average:', expected, 'Displayed text:', displayedText);
  
  if (displayedText === '-' || displayedText === '') {
    throw new Error('Average is empty, but expected a numeric value');
  }
  
  const displayed = parseFloat(displayedText.replace(',', '.'));
  
  if (isNaN(displayed)) {
    throw new Error(`Cannot parse average value: "${displayedText}"`);
  }
  
  expect(displayed).toBeCloseTo(expected, 1);
});

When('eu vejo que a média final é {string}', async function (expectedFinalAverage: string) {
  const page = context.page!;
  const studentName = context.testStudentName!;
  const expected = parseFloat(expectedFinalAverage.replace(',', '.'));
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const displayedText = await getDisplayedFinalAverage(page, studentName);
  // console.log('Expected final average:', expected, 'Displayed text:', displayedText);
  
  if (displayedText === '-' || displayedText === '') {
    throw new Error('Final average is empty, but expected a numeric value');
  }
  
  const displayed = parseFloat(displayedText.replace(',', '.'));
  
  if (isNaN(displayed)) {
    throw new Error(`Cannot parse final average value: "${displayedText}"`);
  }
  
  expect(displayed).toBeCloseTo(expected, 1);
});

When('nota final está vazia', async function () {
  const page = context.page!;
  const studentName = context.testStudentName!;
  
  const isEmpty = await isFinalGradeEmpty(page, studentName);
  expect(isEmpty).toBe(true);
});

Then('eu sei que fui aprovado na final', async function () {
  // Aprovado na final: média pré-final entre 4 e 7, média pós-final >= 5
  const page = context.page!;
  const studentName = context.testStudentName!;
  
  const avgText = await getDisplayedAverage(page, studentName);
  const finalAvgText = await getDisplayedFinalAverage(page, studentName);
  
  const avg = parseFloat(avgText.replace(',', '.'));
  const finalAvg = parseFloat(finalAvgText.replace(',', '.'));
  
  expect(avg).toBeGreaterThanOrEqual(4);
  expect(avg).toBeLessThan(7);
  expect(finalAvg).toBeGreaterThanOrEqual(5);
});

Then('eu sei que estou na final', async function () {
  // Na final: média pré-final entre 4 e 7, sem nota final
  const page = context.page!;
  const studentName = context.testStudentName!;
  
  const avgText = await getDisplayedAverage(page, studentName);
  const avg = parseFloat(avgText.replace(',', '.'));
  
  expect(avg).toBeGreaterThanOrEqual(4);
  expect(avg).toBeLessThan(7);
  
  const isEmpty = await isFinalGradeEmpty(page, studentName);
  expect(isEmpty).toBe(true);
});

Then('eu sei que estou aprovado', async function () {
  // Aprovado: média pré-final >= 7
  const page = context.page!;
  const studentName = context.testStudentName!;
  
  const avgText = await getDisplayedAverage(page, studentName);
  const avg = parseFloat(avgText.replace(',', '.'));
  
  expect(avg).toBeGreaterThanOrEqual(7);
});
