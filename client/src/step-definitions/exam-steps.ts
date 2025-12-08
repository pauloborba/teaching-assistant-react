import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import expect from 'expect';
import { Page, Browser, launch } from 'puppeteer';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

const baseUrl = 'http://localhost:3004';

let examTitleGlobal: string;
let browser: Browser;
let page: Page;

Before({ tags: '@gui' }, async function () {
    browser = await launch({
        headless: false, // Set to true for CI/CD
        slowMo: 50 // Slow down actions for visibility
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@gui' }, async function () {

    if (browser) {
        await browser.close();
    }
});


/* ------------------------------------------------------------
   GIVEN
-------------------------------------------------------------*/

// Professor acessa diretamente a aba de criação de provas
Given('professor {string} accesses the screen {string}', async function (professorName: string, screen: string) {
    await page.goto(baseUrl);

    await page.waitForSelector('h1');

    const title = await page.$eval('h1', el => el.textContent);
    expect(title || '').toContain('Teaching Assistant React');

    await page.waitForSelector('[data-testid="classes-tab"]');

    await page.click('[data-testid="classes-tab"]');

    await page.waitForSelector('[data-testid="classes-container"]');

    await page.waitForSelector('[data-testid^="exams-btn-"]');

    const firstClassButton = await page.$('[data-testid^="exams-btn-"]');
    expect(firstClassButton).toBeTruthy();

    const classId = await page.evaluate(
        el => el!.getAttribute('data-testid')!.replace('exams-btn-', ''),
        firstClassButton
    );

    await page.click(`[data-testid="exams-btn-${classId}"]`);

    await page.waitForSelector('h1');

    expect(await page.$eval('h1', el => el.textContent) || '').toContain('Teaching Assistant React');

    await page.waitForSelector('[data-testid="open-create-exam"]');

    await page.click('[data-testid="open-create-exam"]');

    await page.waitForSelector('[data-testid="exam-popup"]');
});



/* ------------------------------------------------------------
   WHEN
-------------------------------------------------------------*/

When('the professor provides the title {string}', async function (title: string) {
    examTitleGlobal = title;

    await page.waitForSelector('[data-testid="exam-title"]');

    await page.click('[data-testid="exam-title"]');
    await page.type('[data-testid="exam-title"]', title);
});

When('defines the rules {string} and {string}', async function (rule1: string, rule2: string) {

    // Campo para questões abertas
    await page.waitForSelector('[data-testid="open-questions"]');
    await page.click('[data-testid="open-questions"]');
    await page.type('[data-testid="open-questions"]', rule1.replace(/\D/g, '')); // extrai apenas número

    // Campo para questões fechadas
    await page.waitForSelector('[data-testid="closed-questions"]');
    await page.click('[data-testid="closed-questions"]');
    await page.type('[data-testid="closed-questions"]', rule2.replace(/\D/g, ''));
});

When('selects the questions {string} and {string} and {string} and {string} and {string}', async function (q1: string, q2: string, q3: string, q4: string, q5: string) {
    const questionsToSelect = [q1, q2, q3, q4, q5];
    // Aguarda carregar a lista
    await page.waitForSelector('.questions-list .question-item');
    for (const qId of questionsToSelect) {
        const checkboxSelector = `[data-testid="question-checkbox-${qId}"]`;
        // Verifica se o checkbox existe antes de clicar
        await page.waitForSelector(checkboxSelector);
        await page.click(checkboxSelector);
    }
});

When('confirms the exam registration', async function () {
    await page.waitForSelector('[data-testid="confirm-create-exam"]');
    await page.click('[data-testid="confirm-create-exam"]');
    await page.waitForSelector('[data-testid="exam-table"]', { timeout: 5000 });
});

/* ------------------------------------------------------------
   THEN
-------------------------------------------------------------*/
Then('the system registers the exam {string} successfully', async function (title: string) {
    // Esse passo intermediário não faz verificação —
    // os próximos steps validam o comportamento real.
});

Then('displays the message {string}', async function (msg: string) {

    // Espera até 5s até que o texto do alerta apareça na página
    await page.waitForFunction(
        (text: string) => {
            const alerts = Array.from(document.querySelectorAll('.MuiAlert-root'));
            return alerts.some(alert => alert.textContent?.includes(text));
        },
        { timeout: 5000 },
        msg
    );
});

Then('the exam {string} appears in the list of registered exams', async function (title: string) {
    // Abrir dropdown
    await page.click('[data-testid="dropdown-button"]');

    const selector = `[data-testid="dropdown-item-${title}"]`;

    // Esperar o item aparecer
    await page.waitForSelector(selector, { timeout: 5000 });

    const exists = await page.$(selector);
    expect(exists).toBeTruthy();
});
