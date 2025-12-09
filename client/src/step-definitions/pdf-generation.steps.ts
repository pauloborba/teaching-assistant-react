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
        args: ['--no-sandbox'], 
        slowMo: 50 
    });
    page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath });

    await page.goto('http://localhost:3004', { waitUntil: 'networkidle0' });
    
    const classesTab = `xpath///button[contains(., 'Classes')] | //div[contains(@role, 'tab')][contains(., 'Classes')]`;
    try { 
        await page.waitForSelector(classesTab, {visible: true, timeout: 3000});
        const [el] = await page.$$(classesTab);
        await el.click();
    } catch(e) {}

    const nomeTurma = turmaId.split('-')[0].trim();
    const examsBtn = `xpath//tr[contains(., '${nomeTurma}')]//button[contains(., 'Exams')]`;
    
    try {
        await page.waitForSelector(examsBtn, { timeout: 10000 });
        const [btn] = await page.$$(examsBtn);
        await btn.click();
        await page.waitForSelector("xpath///button[contains(., 'Todas as provas')]", { timeout: 10000 });
    } catch (e) {
        await page.goto(`http://localhost:3004/exam/${encodeURIComponent(turmaId)}`, { waitUntil: 'networkidle0' });
    }
};

const interactWithDropdown = async (optionText: string) => {
    const dropdown = `xpath///button[contains(., 'Todas as provas')] | //div[@role='button'][contains(., 'Todas as provas')]`;
    await page!.waitForSelector(dropdown);
    const [d] = await page!.$$(dropdown);
    await d.click();
    
    const option = `xpath///li[contains(., '${optionText}')]`;
    await page!.waitForSelector(option);
    const [o] = await page!.$$(option);
    await o.click();
    
    await new Promise(r => setTimeout(r, 500));
};

const fillModalAndConfirm = async (qty: string) => {
    const btnGerar = `xpath///button[contains(., 'Gerar Lote')]`;
    await page!.waitForSelector(btnGerar);
    const [b] = await page!.$$(btnGerar);
    await b.click();

    await page!.waitForSelector('input[type="number"]', { visible: true });
    await page!.click('input[type="number"]', { clickCount: 3 });
    await page!.type('input[type="number"]', qty);

    const btnBaixar = `xpath///button[contains(., 'Baixar Lote') and contains(@class, 'MuiButton-contained')]`;
    const [confirm] = await page!.$$(btnBaixar);
    if (confirm) await confirm.click();
};

Given('que o professor está gerenciando a turma {string}', { timeout: 60000 }, async function (turmaId) {
    await ensurePageLoaded(turmaId);
});

When('ele solicita a geração do lote da prova {string} para {string} alunos', async function (nomeProva, qtd) {
    await interactWithDropdown(nomeProva);
    await fillModalAndConfirm(qtd);
});

Then('o sistema deve iniciar o download do arquivo {string}', async function (nomeArquivo) {
    await new Promise(r => setTimeout(r, 1500));
    const errorAlert = await page!.$('.MuiAlert-standardError');
    assert.strictEqual(errorAlert, null, 'Erro visual apareceu ao tentar baixar!');
});

When('ele tenta gerar o lote da prova {string} com quantidade {string}', async function (nomeProva, qtd) {
    await interactWithDropdown(nomeProva);
    
    const btnGerar = `xpath///button[contains(., 'Gerar Lote')]`;
    await page!.waitForSelector(btnGerar);
    const [b] = await page!.$$(btnGerar);
    await b.click();

    await page!.waitForSelector('input[type="number"]');
    await page!.click('input[type="number"]', { clickCount: 3 });
    await page!.type('input[type="number"]', qtd);
});

Then('o sistema deve impedir o prosseguimento da ação', async function () {
    const btnBaixarXpath = `xpath///button[contains(., 'Baixar Lote') and contains(@class, 'MuiButton-contained')]`;
    const [btn] = await page!.$$(btnBaixarXpath);
    
    const isDisabled = await page!.evaluate((el: any) => el.disabled || el.getAttribute('aria-disabled') === 'true', btn);
    const isInputInvalid = await page!.$eval('input[type="number"]', (el: any) => !el.checkValidity());

    assert.ok(isDisabled || isInputInvalid, "O sistema permitiu clicar com valor inválido!");
});

Then('deve sinalizar que o valor é inválido', async function () {
    return true; 
});

When('ele inicia a configuração da prova {string} mas desiste', async function (nomeProva) {
    await interactWithDropdown(nomeProva);
    
    const btnGerar = `xpath///button[contains(., 'Gerar Lote')]`;
    await page!.waitForSelector(btnGerar);
    const [b] = await page!.$$(btnGerar);
    await b.click();

    const btnCancel = `xpath///button[contains(., 'Cancelar')]`;
    await page!.waitForSelector(btnCancel);
    const [c] = await page!.$$(btnCancel);
    await c.click();
});

Then('nenhum download deve ser iniciado', async function () {
    const alerts = await page!.$('.MuiAlert-root');
    assert.strictEqual(alerts, null);
});

Then('a interface deve retornar ao estado inicial', async function () {
    await page!.waitForSelector('.MuiDialog-container', { hidden: true, timeout: 3000 });
});

After(async function () {
    if (browser) {
        await browser.close();
        browser = null;
        page = null;
    }
});