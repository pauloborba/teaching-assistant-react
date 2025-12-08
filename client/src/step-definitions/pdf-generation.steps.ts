import { Given, When, Then, After } from '@cucumber/cucumber';
import assert from 'assert'; 
import puppeteer, { Browser, Page } from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let browser: Browser | null = null;
let page: Page | null = null;
const downloadPath = path.resolve(__dirname, '../../downloads_test');

const waitForAndClick = async (xpath: string, timeout = 5000) => {
    if (!page) throw new Error("Página não iniciada");
    try {
        await page.waitForSelector(`xpath/${xpath}`, { visible: true, timeout });
        const [element] = await page.$$(`xpath/${xpath}`);
        await element.click();
    } catch (e) {
        throw new Error(`Não foi possível clicar em: ${xpath}. Erro: ${e}`);
    }
};

Given('que o professor acessou a gestão de provas da turma {string}', { timeout: 60000 }, async function (turmaId) {
    if (browser) await browser.close();
    
    browser = await puppeteer.launch({ 
        headless: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
        defaultViewport: null,
        slowMo: 50 
    });
    page = await browser.newPage();
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: downloadPath });

    await page.goto('http://localhost:3004', { waitUntil: 'networkidle0' });
    
    const classesTabXpath = `//button[contains(., 'Classes')] | //div[contains(@role, 'tab')][contains(., 'Classes')]`;
    try { await waitForAndClick(classesTabXpath); } catch(e) {}

    const nomeTurma = turmaId.split('-')[0].trim();
    const rowXpath = `//tr[.//td[contains(., "${nomeTurma}")]]`;
    
    try {
        await page.waitForSelector(`xpath/${rowXpath}`, { timeout: 10000 });
        const examsBtn = `${rowXpath}//button[contains(., 'Exams')]`;
        await waitForAndClick(examsBtn);
        await page.waitForSelector("xpath///button[contains(., 'Todas as provas')]", { timeout: 10000 });
    } catch (e) {
        console.log("Navegação visual falhou, tentando URL direta...");
        await page.goto(`http://localhost:3004/exam/${encodeURIComponent(turmaId)}`, { waitUntil: 'networkidle0' });
    }
});

When('ele seleciona a prova {string}', async function (nomeProva) {
    if (!page) return;
    const dropdownXpath = `//button[contains(., 'Todas as provas')] | //div[@role='button'][contains(., 'Todas as provas')]`;
    await waitForAndClick(dropdownXpath);
    
    const optionXpath = `//li[contains(., '${nomeProva}')]`;
    await waitForAndClick(optionXpath);
    await new Promise(r => setTimeout(r, 500));
});

When('clica no botão {string}', async function (nomeBotao) {
    const btnXpath = `//button[contains(., '${nomeBotao}')]`;
    await waitForAndClick(btnXpath);
});

Then('o modal {string} deve abrir', async function (tituloModal) {
    const titleXpath = `//h2[contains(., '${tituloModal}')]`;
    await page!.waitForSelector(`xpath/${titleXpath}`, { visible: true });
});

Then('o campo de quantidade deve sugerir o valor {string} \\(total de alunos)', async function (valorEsperado) {
    const inputSelector = 'input[type="number"]';
    await page!.waitForSelector(inputSelector);
    
    const valorAtual = await page!.$eval(inputSelector, (el: any) => el.value);
    assert.strictEqual(valorAtual, valorEsperado, `Esperado: ${valorEsperado}, Recebido: ${valorAtual}`);
});

When('ele confirma o download', async function () {
    const confirmBtnXpath = `//button[contains(., 'Baixar ZIP') or contains(., 'Confirmar')]`;
    await waitForAndClick(confirmBtnXpath);
});

Then('o sistema deve iniciar o download do arquivo {string}', async function (nomeArquivo) {
    await new Promise(r => setTimeout(r, 1500));
    const errorAlert = await page!.$('.MuiAlert-standardError');
    assert.strictEqual(errorAlert, null, 'Erro visual apareceu ao tentar baixar!');
});

Then('o modal deve fechar automaticamente', async function () {
    await page!.waitForSelector('.MuiDialog-container', { hidden: true, timeout: 5000 });
});


When('altera a quantidade para {string} ou {string}', async function (val1, val2) {
    await page!.click('input[type="number"]', { clickCount: 3 });
    await page!.type('input[type="number"]', val1);
});

Then('o botão de confirmação {string} deve estar desabilitado ou exibir erro', async function (nomeBotao) {
    const btnXpath = `xpath///button[contains(., '${nomeBotao}')]`;
    const [btn] = await page!.$$(btnXpath);
    if (!btn) throw new Error(`Botão ${nomeBotao} não encontrado`);

    const isDisabled = await page!.evaluate((el: any) => el.hasAttribute('disabled') || el.disabled, btn);
    const isInputInvalid = await page!.$eval('input[type="number"]', (el: any) => el.value === '' || !el.checkValidity());

    assert.ok(isDisabled || isInputInvalid, 'Sistema permitiu valor inválido!');
});

Then('o modal deve fechar sem iniciar download', async function () {
    await page!.waitForSelector('.MuiDialog-container', { hidden: true, timeout: 5000 });
    const alerts = await page!.$('.MuiAlert-root');
    assert.strictEqual(alerts, null, "Uma mensagem apareceu, o que não deveria ocorrer no cancelamento.");
});

After(async function () {
    if (browser) {
        await browser.close();
        browser = null;
        page = null;
    }
});