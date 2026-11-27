import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';

setDefaultTimeout(30 * 1000);

let browser: Browser;
let page: Page;

const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';

let createdRoteiroTitulo: string | undefined;

async function deleteRoteiroByTituloIfExists(titulo: string, turma?: string): Promise<void> {
  try {
    const query = turma ? `?turma=${encodeURIComponent(turma)}` : '';
    const res = await fetch(`${serverUrl}/api/roteiros${query}`);
    if (!res.ok) return;
    const list: Array<{ id: string; titulo: string }> = await res.json();
    for (const item of list) {
      if (item.titulo === titulo) {
        await fetch(`${serverUrl}/api/roteiros/${encodeURIComponent(item.id)}`, {
          method: 'DELETE',
        });
      }
    }
  } catch {
    // Ignora falha de limpeza caso o servidor não esteja acessível nesse momento
  }
}

Before({ tags: '@gui' }, async function () {
  browser = await launch({
    headless: false,
    slowMo: 50,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@gui' }, async function () {
  if (createdRoteiroTitulo) {
    await deleteRoteiroByTituloIfExists(createdRoteiroTitulo);
    createdRoteiroTitulo = undefined;
  }

  if (browser) {
    await browser.close();
  }
});

Given('que estou autenticado como professor {string}', async function (_professor: string) {
  await page.goto(baseUrl, { waitUntil: 'networkidle2' });
  await page.waitForSelector('h1', { timeout: 10000 });
});

Given('que a turma {string} está cadastrada', async function (_turma: string) {
  // Garante que a aplicação carregou e a aba de Roteiros está disponível
  await page.waitForSelector('[data-testid="roteiros-tab"]', { timeout: 10000 });
});

Given('que estou na página de gerenciamento de roteiros', async function () {
  const roteirosTab = await page.$('[data-testid="roteiros-tab"]');
  expect(roteirosTab).toBeTruthy();
  await roteirosTab!.click();
  await page.waitForSelector('[data-testid="roteiro-form"]', { timeout: 10000 });
});

Given('que não existe roteiro {string} na turma {string}', async function (titulo: string, turma: string) {
  createdRoteiroTitulo = titulo;
  await deleteRoteiroByTituloIfExists(titulo, turma);
  await page.reload({ waitUntil: 'networkidle2' });

  const roteirosTab = await page.$('[data-testid="roteiros-tab"]');
  if (roteirosTab) {
    await roteirosTab.click();
  }
  await page.waitForSelector('[data-testid="roteiro-form"]', { timeout: 10000 });

  const row = await page.$(`[data-testid="roteiro-row-${titulo}"]`);
  expect(row).toBeNull();
});

When('eu insiro o roteiro com os seguintes dados:', async function (dataTable: DataTable) {
  const rows = dataTable.raw();
  const data: Record<string, string> = {};
  for (const [chave, valor] of rows) {
    if (chave) {
      data[chave.trim().toLowerCase()] = (valor ?? '').trim();
    }
  }

  const titulo = data['título'] || data['titulo'] || '';
  const descricao = data['descrição'] || data['descricao'] || '';
  const turma = data['turma'] || '';
  const abertura = data['data de abertura'] || data['abertura'] || '';
  const prazo = data['prazo de entrega'] || data['prazo'] || '';
  const atividades = data['atividades'] || '';

  if (titulo) {
    createdRoteiroTitulo = titulo;
  }

  await page.click('[data-testid="roteiro-titulo-input"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  if (titulo) await page.type('[data-testid="roteiro-titulo-input"]', titulo);

  await page.click('[data-testid="roteiro-descricao-input"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  if (descricao) await page.type('[data-testid="roteiro-descricao-input"]', descricao);

  await page.click('[data-testid="roteiro-turma-input"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  if (turma) await page.type('[data-testid="roteiro-turma-input"]', turma);

  await page.click('[data-testid="roteiro-abertura-input"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  if (abertura) await page.type('[data-testid="roteiro-abertura-input"]', abertura);

  await page.click('[data-testid="roteiro-prazo-input"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  if (prazo) await page.type('[data-testid="roteiro-prazo-input"]', prazo);

  await page.click('[data-testid="roteiro-atividades-input"]', { clickCount: 3 });
  await page.keyboard.press('Backspace');
  if (atividades) await page.type('[data-testid="roteiro-atividades-input"]', atividades);

  await page.click('[data-testid="roteiro-submit-button"]');
  await new Promise((resolve) => setTimeout(resolve, 800));
});

Then('devo ver uma mensagem de sucesso', async function () {
  await page.waitForSelector('[data-testid="roteiro-success-message"]', { timeout: 10000 });
  const msg = await page.$eval('[data-testid="roteiro-success-message"]', (el) => el.textContent || '');
  expect(msg.toLowerCase()).toContain('sucesso');
});

Then('o roteiro {string} está armazenado na turma {string}', async function (titulo: string, turma: string) {
  await page.waitForSelector(`[data-testid="roteiro-row-${titulo}"]`, { timeout: 10000 });
  const rowText = await page.$eval(`[data-testid="roteiro-row-${titulo}"]`, (el) => el.textContent || '');
  expect(rowText).toContain(titulo);
  expect(rowText).toContain(turma);
});

Then('ele tem o prazo de entrega {string} e {int} atividades', async function (prazo: string, qtdAtividades: number) {
  expect(createdRoteiroTitulo).toBeTruthy();
  const rowText = await page.$eval(
    `[data-testid="roteiro-row-${createdRoteiroTitulo}"]`,
    (el) => el.textContent || ''
  );
  expect(rowText).toContain(prazo);

  const res = await fetch(`${serverUrl}/api/roteiros`);
  const roteiros = await res.json();
  const alvo = roteiros.find((r: any) => r.titulo === createdRoteiroTitulo);
  expect(alvo).toBeTruthy();
  expect(Array.isArray(alvo.atividades) ? alvo.atividades.length : 0).toBe(qtdAtividades);
});