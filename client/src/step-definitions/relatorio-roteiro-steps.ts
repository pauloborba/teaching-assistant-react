import { Given, When, Then, Before, After } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';
import {
  parseTurma, cadastrarResultado, removerResultados,
  verificarNenhumaTurmaPassadaComResultados, limparDadosDeTeste
} from './relatorio-roteiro-helpers';

const baseUrl = 'http://localhost:3004';

// Tempo limite maior nos passos que abrem o navegador ou usam a página:
// na primeira execução o Chrome e a página demoram mais para carregar
const TEMPO_LIMITE = { timeout: 60 * 1000 };
const TAGS_GUI = '@relatorio-gui or @relatorio-gui-extra';

let browser: Browser;
let page: Page;
let turmasConfiguradas: string[];

Before({ tags: TAGS_GUI, ...TEMPO_LIMITE }, async function () {
  turmasConfiguradas = [];
  browser = await launch({
    headless: process.env.HEADLESS === 'true', // HEADLESS=true roda sem abrir a janela
    slowMo: 50
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: TAGS_GUI, ...TEMPO_LIMITE }, async function () {
  if (browser) {
    await browser.close();
  }
  await limparDadosDeTeste();
});

// Lê as linhas da tabela do relatório: [{ turma, acertos, erros, tempo }]
async function lerLinhasDaTabela() {
  return page.$$eval('[data-testid="linha-relatorio"]', linhas => linhas.map(linha => ({
    turma: linha.querySelector('[data-testid="linha-turma"]')?.textContent,
    acertos: linha.querySelector('[data-testid="linha-acertos"]')?.textContent,
    erros: linha.querySelector('[data-testid="linha-erros"]')?.textContent,
    tempo: linha.querySelector('[data-testid="linha-tempo"]')?.textContent
  })));
}

async function lerTurmasDaTabela() {
  return (await lerLinhasDaTabela()).map(linha => linha.turma);
}

async function verificarPagina(nomePagina: string) {
  const titulo = await page.$eval('[data-testid="titulo-pagina"]', el => el.textContent);
  expect(titulo).toBe(nomePagina);
}

// Escolhe a turma atual no select (espera a opção aparecer)
async function escolherTurmaAtual(turmaAtual: string) {
  const turmaAtualId = parseTurma(turmaAtual).id;
  await page.waitForSelector(`#turma-atual option[value="${turmaAtualId}"]`);
  await page.select('#turma-atual', turmaAtualId);
}

// Preenche o formulário e espera o resultado (linhas na tabela ou mensagem de erro)
async function pedirRelatorio(roteiro: string, turmaAtual: string, passadas: string[]) {
  await escolherTurmaAtual(turmaAtual);
  await page.click('#roteiro', { clickCount: 3 }); // seleciona o texto que já estiver no campo
  await page.type('#roteiro', roteiro);

  for (const passada of passadas) {
    await page.click(`[data-testid="passada-${parseTurma(passada).id}"]`);
  }

  // Clica e espera a resposta do server, depois espera a página mostrar o resultado
  await Promise.all([
    page.waitForResponse(response => response.url().includes('/api/relatorio-roteiro')),
    page.click('[data-testid="gerar-relatorio"]')
  ]);
  await page.waitForSelector('[data-testid="linha-relatorio"], [data-testid="mensagem-erro"]');
}

// ---------- Given ----------

Given('a turma {string} tem, no {string}, média de acertos {string}, média de erros {string} e tempo de entrega médio de {string}',
  async function (turma: string, roteiro: string, acertos: string, erros: string, tempo: string) {
    await cadastrarResultado(turma, roteiro, acertos, erros, tempo);
    turmasConfiguradas.push(turma);
  });

Given('a turma {string} não tem resultados no {string}', async function (turma: string, roteiro: string) {
  await removerResultados(turma, roteiro);
  turmasConfiguradas.push(turma);
});

Given('nenhuma turma passada tem resultados no {string}', async function (roteiro: string) {
  await verificarNenhumaTurmaPassadaComResultados(roteiro, turmasConfiguradas);
});

Given('eu estou na página {string}', TEMPO_LIMITE, async function (nomePagina: string) {
  await page.goto(baseUrl);
  await page.waitForSelector('[data-testid="relatorio-roteiro-tab"]');
  await page.click('[data-testid="relatorio-roteiro-tab"]');
  await page.waitForSelector('[data-testid="titulo-pagina"]');
  await verificarPagina(nomePagina);
});

// ---------- When ----------

When('eu peço o relatório do {string} da turma {string} em comparação com as turmas {string} e {string}', TEMPO_LIMITE,
  async function (roteiro: string, turmaAtual: string, passada1: string, passada2: string) {
    await pedirRelatorio(roteiro, turmaAtual, [passada1, passada2]);
  });

When('eu peço o relatório do {string} da turma {string}', TEMPO_LIMITE, async function (roteiro: string, turmaAtual: string) {
  await pedirRelatorio(roteiro, turmaAtual, []);
});

// Passos usados só nos cenários extras de GUI (relatorio-roteiro-extra.feature)

When('eu peço o relatório do {string} da turma {string} em comparação com a turma {string}', TEMPO_LIMITE,
  async function (roteiro: string, turmaAtual: string, passada: string) {
    await pedirRelatorio(roteiro, turmaAtual, [passada]);
  });

When('eu peço o relatório do {string} da turma {string} em comparação com as turmas {string}, {string} e {string}', TEMPO_LIMITE,
  async function (roteiro: string, turmaAtual: string, passada1: string, passada2: string, passada3: string) {
    await pedirRelatorio(roteiro, turmaAtual, [passada1, passada2, passada3]);
  });

When('eu escolho a turma atual {string}', TEMPO_LIMITE, async function (turmaAtual: string) {
  await escolherTurmaAtual(turmaAtual);
});

// ---------- Then ----------

Then('continuo na página {string}', async function (nomePagina: string) {
  await verificarPagina(nomePagina);
});

Then('vejo na tabela, na linha {string}, média de acertos {string}, média de erros {string} e tempo de entrega médio de {string}',
  async function (turma: string, acertos: string, erros: string, tempo: string) {
    const linhas = await lerLinhasDaTabela();
    expect(linhas).toContainEqual({ turma, acertos, erros, tempo });
  });

Then('não vejo na tabela linhas das turmas {string} e {string}', async function (turma1: string, turma2: string) {
  const turmas = await lerTurmasDaTabela();
  expect(turmas).not.toContain(turma1);
  expect(turmas).not.toContain(turma2);
});

Then('não vejo na tabela a linha {string}', async function (turma: string) {
  const turmas = await lerTurmasDaTabela();
  expect(turmas).not.toContain(turma);
});

Then('não vejo na tabela nenhuma linha', async function () {
  expect(await lerLinhasDaTabela()).toEqual([]);
});

Then('eu vejo uma mensagem de erro {string}', async function (mensagem: string) {
  const texto = await page.$eval('[data-testid="mensagem-erro"]', el => el.textContent);
  expect(texto).toBe(mensagem);
});

Then('não vejo mensagem de erro', async function () {
  expect(await page.$('[data-testid="mensagem-erro"]')).toBeNull();
});

async function lerTurmasPassadasDisponiveis() {
  return page.$$eval('.turma-passada', labels => labels.map(label => label.textContent?.trim()));
}

Then('vejo {string} entre as turmas passadas para comparar', async function (turma: string) {
  expect(await lerTurmasPassadasDisponiveis()).toContain(turma);
});

Then('não vejo {string} entre as turmas passadas para comparar', async function (turma: string) {
  expect(await lerTurmasPassadasDisponiveis()).not.toContain(turma);
});
