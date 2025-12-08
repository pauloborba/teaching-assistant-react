import { Given, When, Then } from '@cucumber/cucumber';
import { launch, Browser, Page } from 'puppeteer';
import * as assert from 'assert';

const baseUrl = 'http://localhost:3004';
const serverUrl = 'http://localhost:3005';

// Dados de teste baseados em server/data/app-data.json
const class1Topic = "Engenharia de Software e Sistemas";
const class1Display = `${class1Topic} (1/2025)`;
const student1Cpf = "11111111111"; // Paulo Borba

const class2Topic = "Engenharia de Software e Sistemas";
const class2Display = `${class2Topic} (2/2025)`;
const class2StudentCount = 2; // 22222222222 e 33333333333

let browser: Browser;
let page: Page;

// --- Funções Auxiliares ---

async function setup() {
    console.log('Iniciando o navegador...');
    browser = await launch({
        headless: true,
        slowMo: 50,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    console.log('Navegador iniciado.');
}

async function teardown() {
    if (browser) {
        await browser.close();
        console.log('Navegador fechado.');
    }
}

async function navigateToNotifications() {
    console.log('Navegando para a área de Notificações...');
    await page.goto(baseUrl, { waitUntil: 'networkidle0' });

    // Clicar na aba Notificações
    const notificationsButton = await page.waitForFunction(
        () => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn => btn.textContent && (btn.textContent.includes('notifications') || btn.textContent.includes('Notificações por Email')));
        },
        { timeout: 20000 }
    );
    assert.ok(notificationsButton, 'Botão de Notificações não encontrado.');
    await (notificationsButton as any).click();

    // Esperar pelo formulário de notificações e o carregamento das classes
    await page.waitForSelector('.notification-form', { timeout: 20000 });
    await page.waitForFunction(
        () => document.querySelectorAll('#classSelect option').length > 1,
        { timeout: 20000 }
    );
    console.log('Na área de Notificações.');
}

async function selectOptionByText(selector: string, text: string) {
    const selectElement = await page.waitForSelector(selector, { timeout: 5000 });
    assert.ok(selectElement, `Seletor ${selector} não encontrado.`);

    const optionValue = await page.evaluate((select: HTMLSelectElement, label) => {
        const options = Array.from(select.options);
        // Tenta encontrar pelo texto completo ou apenas pelo tópico (para ser mais robusto)
        const option = options.find(opt => opt.text.includes(label) || opt.text.includes(label.split(' (')[0]));
        return option ? option.value : null;
    }, selectElement as any, text);

    assert.ok(optionValue, `Opção com texto "${text}" não encontrada em ${selector}.`);
    await page.select(selector, optionValue!);
    // Pequena pausa para re-renderização
    await new Promise(resolve => setTimeout(resolve, 500));
}

async function clickSendButton() {
    const button = await page.waitForSelector('button[type="submit"]', { timeout: 5000 });
    assert.ok(button, 'Botão de Enviar Notificação não encontrado.');

    // Esperar que o botão esteja habilitado (não em estado de loading)
    await page.waitForFunction(
        () => {
            const btn = document.querySelector('button[type="submit"]');
            return btn && btn.textContent !== 'Enviando...';
        },
        { timeout: 5000 }
    );

    await button.click();
    // Esperar o processamento da submissão
    await new Promise(resolve => setTimeout(resolve, 2000));
}

async function checkSuccessMessage(expectedMessage: string) {
    await page.waitForFunction(
        (msg) => document.body.textContent && document.body.textContent.includes(msg),
        {},
        expectedMessage
    );
    const bodyText = await page.evaluate(() => document.body.textContent);
    assert.ok(bodyText, 'Conteúdo do corpo da página é nulo.');
    assert.ok(bodyText.includes(expectedMessage), `Mensagem de sucesso esperada "${expectedMessage}" não encontrada.`);
    console.log(`Sucesso: "${expectedMessage}"`);
}

// --- Steps ---

Given('que o servidor e o cliente estão rodando', async () => {
    // O servidor e o cliente serão iniciados no BeforeAll do Jest-Cucumber
    // Apenas garante que o Puppeteer está pronto
    await setup();
});

Given('que a página de Notificações está aberta', async () => {
    await navigateToNotifications();
});

When('eu seleciono o tipo de notificação {string}', async (notificationType: string) => {
    await selectOptionByText('#notificationType', notificationType);
});

When('eu seleciono a turma {string}', async (classDisplay: string) => {
    await selectOptionByText('#classSelect', classDisplay);
});

When('eu seleciono o aluno {string}', async (studentCpf: string) => {
    await selectOptionByText('#studentSelect', studentCpf);
});

When('eu clico no botão de enviar notificação', async () => {
    await clickSendButton();
});

Then('eu devo ver a mensagem de sucesso {string}', async (expectedMessage: string) => {
    await checkSuccessMessage(expectedMessage);
    await teardown(); // Fecha o navegador após o teste
});