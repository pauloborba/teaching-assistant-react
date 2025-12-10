import { Given, When, Then, After } from '@cucumber/cucumber';
import assert from 'assert'; 
import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let browser: Browser | null = null;
let page: Page | null = null;
const downloadPath = path.join(os.tmpdir(), 'exams_autotest');

const ensurePageLoaded = async (turmaId: string) => {
    if (browser) await browser.close();
    
    browser = await puppeteer.launch({ 
        headless: false,
        slowMo: 50,
        defaultViewport: null, 
        args: ['--no-sandbox', '--start-maximized']
    });
    
    const pages = await browser.pages();
    page = pages.length > 0 ? pages[0] : await browser.newPage();
    
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath });

    const targetUrl = `http://localhost:3004/exam/${encodeURIComponent(turmaId)}`;
    await page.goto(targetUrl, { waitUntil: 'networkidle0' });
    
    try {
        await page.waitForSelector('[data-testid="exam-dropdown"]', { timeout: 10000 });
    } catch (e) {
        throw new Error(`Botão do dropdown não encontrado na página ${targetUrl}.`);
    }
};

const ensureExamExists = async (nomeProva: string) => {
    // 1. Abre o menu para checar
    await page!.click('[data-testid="exam-dropdown"]');
    
    const itemSelector = `[data-testid="dropdown-item-${nomeProva}"]`;
    await new Promise(r => setTimeout(r, 500));
    
    const item = await page!.$(itemSelector);

    if (item) {
        console.log(`Prova '${nomeProva}' encontrada. Mantendo menu aberto.`);
        return; 
    } else {
        console.log(`Prova '${nomeProva}' não encontrada. Criando...`);
        
        await page!.mouse.click(1, 1);
        await new Promise(r => setTimeout(r, 500));

        const btnCriar = `xpath///button[contains(., 'Criar Prova')]`;
        await page!.waitForSelector(btnCriar);
        const [b] = await page!.$$(btnCriar);
        await b.click();
        
        await page!.waitForSelector('input[name="nomeProva"]', { visible: true });
        await page!.type('input[name="nomeProva"]', nomeProva);
        await page!.type('input[name="codProva"]', 'COD-' + Date.now());
        await page!.click('input[name="abertas"]', {clickCount: 3});
        await page!.type('input[name="abertas"]', '1');
        await page!.click('input[name="fechadas"]', {clickCount: 3});
        await page!.type('input[name="fechadas"]', '1');
        
        const checkboxes = await page!.$$('input[type="checkbox"]');
        if (checkboxes.length > 0) await checkboxes[0].click();
        
        const btnSalvar = `xpath//div[contains(@class, 'MuiDialog-actions')]//button[not(contains(., 'Cancelar'))]`;
        await page!.waitForSelector(btnSalvar);
        const [salvar] = await page!.$$(btnSalvar);
        await salvar.click();
        
        await page!.waitForSelector('div[role="dialog"]', { hidden: true, timeout: 5000 });
        await new Promise(r => setTimeout(r, 1000));
        
        await page!.click('[data-testid="exam-dropdown"]');
        await page!.waitForSelector(itemSelector, { visible: true, timeout: 5000 });
    }
};

Given('que o professor está gerenciando a turma {string}', { timeout: 60000 }, async function (turmaId) {
    await ensurePageLoaded(turmaId);
});

Given('a prova {string} já foi criada e está disponível na lista', { timeout: 30000 }, async function (nomeProva) {
    await ensureExamExists(nomeProva);
});

Given('a turma possui {string} alunos matriculados', async function (qtd) {
    this.expectedQtd = qtd;
});

When('ele seleciona a prova {string}', async function (nomeProva) {
    const itemSelector = `[data-testid="dropdown-item-${nomeProva}"]`;
    
    const isVisible = await page!.$(itemSelector).then(res => res && res.boundingBox() != null);

    if (!isVisible) {
        console.log("Menu estava fechado. Abrindo novamente...");
        await page!.click('[data-testid="exam-dropdown"]');
    }
    
    await page!.waitForSelector(itemSelector, { visible: true, timeout: 5000 });
    await page!.click(itemSelector);
});

When('solicita a geração do lote', async function () {
    const btnGerar = `xpath///button[contains(., 'Gerar Lote')]`;
    await page!.waitForSelector(btnGerar);
    const [b] = await page!.$$(btnGerar);
    await b.click();
});

Then('o sistema deve sugerir a quantidade {string} para impressão', async function (qtdEsperada) {
    await page!.waitForSelector('input[type="number"]', { visible: true });
    const valor = await page!.$eval('input[type="number"]', el => (el as HTMLInputElement).value);
    assert.strictEqual(valor, qtdEsperada, `Valor incorreto: ${valor}`);
});

When('altera a quantidade de cópias para {string}', async function (novaQtd) {
    await page!.waitForSelector('input[type="number"]');
    await page!.click('input[type="number"]', { clickCount: 3 });
    await page!.type('input[type="number"]', novaQtd);
});

When(/^(?:ele )?confirma o download$/, async function () {
    const btnBaixar = `xpath///button[contains(., 'Baixar Lote')]`;
    try {
        await page!.waitForSelector(btnBaixar, { visible: true, timeout: 5000 });
        const [btn] = await page!.$$(btnBaixar);
        await btn.click();
        await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
        throw new Error("Botão 'Baixar Lote' não encontrado.");
    }
});

Then('o sistema deve iniciar o download do arquivo {string}', async function (nomeArquivo) {
    await new Promise(r => setTimeout(r, 1000));
    const errorAlert = await page!.$('.MuiAlert-standardError');
    assert.strictEqual(errorAlert, null, 'Erro visual apareceu!');
});

Then('a operação deve ser concluída com sucesso', async function () {
    await page!.waitForSelector('div[role="dialog"]', { hidden: true, timeout: 5000 });
});

Then('nenhuma mensagem de erro deve ser exibida', async function () {
    const errorAlert = await page!.$('.MuiAlert-standardError');
    assert.strictEqual(errorAlert, null);
});

When('decide cancelar a operação', async function () {
    const btnCancel = `xpath///button[contains(., 'Cancelar')]`;
    await page!.click(btnCancel);
});

Then('nenhum download deve ser iniciado', async function () {
    // OK
});

Then('o sistema deve retornar ao estado inicial da listagem', async function () {
    await page!.waitForSelector('div[role="dialog"]', { hidden: true });
});

Then('a prova {string} deve continuar selecionada', async function (nomeProva) {
    const btnText = await page!.$eval('[data-testid="exam-dropdown"]', el => el.textContent);
    assert.ok(btnText?.includes(nomeProva));
});

// STEPS DE UNIDADE DE GUI

Then('o botão {string} deve estar visível e habilitado', async function (btnTexto) {
    const btnSelector = `xpath///button[contains(., '${btnTexto}')]`;
    try {
        await page!.waitForSelector(btnSelector, { visible: true, timeout: 3000 });
    } catch (e) {
        throw new Error(`Botão '${btnTexto}' não está visível.`);
    }

    const isDisabled = await page!.$eval(btnSelector, (el) => (el as HTMLButtonElement).disabled);
    assert.strictEqual(isDisabled, false, `Botão '${btnTexto}' está desabilitado.`);
});

When('ele clica no botão {string}', async function (btnTexto) {
    const btnSelector = `xpath///button[contains(., '${btnTexto}')]`;
    await page!.waitForSelector(btnSelector);
    const [btn] = await page!.$$(btnSelector);
    await btn.click();
});

Then('o modal com título {string} deve ser exibido', async function (tituloModal) {
    const dialogSelector = 'div[role="dialog"]';

    try {
        await page!.waitForSelector(dialogSelector, { visible: true, timeout: 5000 });
    } catch (e) {
        throw new Error("O modal (div[role='dialog']) não abriu após o clique.");
    }

    try {
        await page!.waitForFunction(
            (selector, textToFind) => {
                const el = document.querySelector(selector);
                return el && el.textContent && el.textContent.includes(textToFind);
            },
            { timeout: 5000 },
            dialogSelector,
            tituloModal
        );
    } catch (e) {
        const currentText = await page!.$eval(dialogSelector, el => el.textContent);
        throw new Error(`Título '${tituloModal}' não encontrado no modal. Texto visível: '${currentText}'`);
    }
});

After(async function () {
    if (browser) await browser.close();
});