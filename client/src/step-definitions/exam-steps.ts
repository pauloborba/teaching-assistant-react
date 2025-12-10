import { Given, When, Then, Before, After, DataTable, setDefaultTimeout } from '@cucumber/cucumber';
import expect from 'expect';
import { Page, Browser, launch } from 'puppeteer';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

const baseUrl = 'http://localhost:3004';

let examTitleGlobal: string;
let browser: Browser;
let page: Page;

Before({ tags: '@gui or @create-exam' }, async function () {
    browser = await launch({
        headless: false, // Set to true for CI/CD
        slowMo: 50 // Slow down actions for visibility
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@gui or @create-exam' }, async function () {

    if (browser) {
        await browser.close();
    }
});


/* ------------------------------------------------------------
   GIVEN
-------------------------------------------------------------*/

// Professor acessa diretamente a aba de criação de provas
Given('professor {string} accesses the screen Exam', async function (professorName: string) {
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


});

Given("open the popup {string}", async function (popupName: string) {
    await page.waitForSelector('[data-testid="open-create-exam"]');

    await page.click('[data-testid="open-create-exam"]');

    await page.waitForSelector('[data-testid="exam-popup"]');

});

Given("professor {string} registers the exam {string} with questions {string} and {string} and {string} and {string} and {string}", async function (professorName: string, examTitle: string, q1: string, q2: string, q3: string, q4: string, q5: string) {
    examTitleGlobal = examTitle;

    await page.waitForSelector('[data-testid="exam-title"]');

    await page.click('[data-testid="exam-title"]');
    await page.type('[data-testid="exam-title"]', examTitle);

    // Select questions
    const questionsToSelect = [q1, q2, q3, q4, q5];
    // Aguarda carregar a lista
    await page.waitForSelector('.questions-list .question-item');
    for (const qId of questionsToSelect) {
        const checkboxSelector = `[data-testid="question-checkbox-${qId}"]`;
        // Verifica se o checkbox existe antes de clicar
        await page.waitForSelector(checkboxSelector);
        await page.click(checkboxSelector);
    }
    //Confirmar o registro
    await page.waitForSelector('[data-testid="confirm-create-exam"]');
    await page.click('[data-testid="confirm-create-exam"]');
    await page.waitForSelector('[data-testid="exam-table"]', { timeout: 5000 });
});

// Step alternativo para usar com "And registers..." (sem o parâmetro professor)
Given('registers the exam {string} with questions {string} and {string} and {string} and {string} and {string}', async function (examTitle: string, q1: string, q2: string, q3: string, q4: string, q5: string) {
    examTitleGlobal = examTitle;

    await page.waitForSelector('[data-testid="exam-title"]');

    await page.click('[data-testid="exam-title"]');
    await page.type('[data-testid="exam-title"]', examTitle);

    // Select questions
    const questionsToSelect = [q1, q2, q3, q4, q5];
    // Aguarda carregar a lista
    await page.waitForSelector('.questions-list .question-item');
    for (const qId of questionsToSelect) {
        const checkboxSelector = `[data-testid="question-checkbox-${qId}"]`;
        // Verifica se o checkbox existe antes de clicar
        await page.waitForSelector(checkboxSelector);
        await page.click(checkboxSelector);
    }
    //Confirmar o registro
    await page.waitForSelector('[data-testid="confirm-create-exam"]');
    await page.click('[data-testid="confirm-create-exam"]');
    await page.waitForSelector('[data-testid="exam-table"]', { timeout: 5000 });
});


Given('class {string} has exams {string} and {string} registered', async function (className: string, exam1: string, exam2: string) {
    await page.waitForSelector('[data-testid="exam-dropdown"]');
    await page.click('[data-testid="exam-dropdown"]');
    await page.waitForSelector('[data-testid="exam-dropdown"]');
})

Given


/* ------------------------------------------------------------
WHEN
-------------------------------------------------------------*/

When('professor {string} selects the list of exams of the class {string}', async function (professorName: string, className: string) {

})

When('the professor provides the title {string}', async function (title: string) {
    examTitleGlobal = title;

    await page.waitForSelector('[data-testid="exam-title"]');

    await page.click('[data-testid="exam-title"]');
    await page.type('[data-testid="exam-title"]', title);
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
});

When('professor {string} deletes the exam {string}', async function (professorName: string, examTitle: string) {
    // First, select the exam from the dropdown
    await page.click('[data-testid="exam-dropdown"]');
    await page.waitForSelector(`[data-testid="dropdown-item-${examTitle}"]`);
    await page.click(`[data-testid="dropdown-item-${examTitle}"]`);

    // Wait for the delete button to appear (it only shows when a specific exam is selected)
    await page.waitForSelector('[data-testid="delete-exam-button"]', { timeout: 5000 });

    // Set up dialog handler BEFORE clicking the delete button
    page.once('dialog', async dialog => {
        await dialog.accept(); // Confirm the deletion
    });

    // Click the delete button
    await page.click('[data-testid="delete-exam-button"]');
});

When('the professor uses {string}', async function (buttonName: string) {
    await page.waitForSelector(`[data-testid="${buttonName}"]`);
    await page.click(`[data-testid="${buttonName}"]`);
});

When('selects no questions', async function () {

})

/* ------------------------------------------------------------
   THEN
-------------------------------------------------------------*/

Then('the system shows the list of exams {string} and {string}', async function (exam1: string, exam2: string) {
    await page.waitForSelector(`[data-testid="dropdown-item-${exam1}"]`);
    await page.waitForSelector(`[data-testid="dropdown-item-${exam2}"]`);

    const examExists = await page.$(`[data-testid="dropdown-item-${exam1}"]`);
    const examExists2 = await page.$(`[data-testid="dropdown-item-${exam2}"]`);
    expect(examExists).toBeTruthy();
    expect(examExists2).toBeTruthy();
})

Then('popup {string} should be visible', async function (popupName: string) {
    await page.waitForSelector(`[data-testid="${popupName}"]`);
})

Then('the system still shows the popup {string}', async function (popupName: string) {
    await page.waitForSelector(`[data-testid="${popupName}"]`);
})

Then('the system shows the message {string}', async function (msg: string) {
    // Wait for the alert message to appear
    // Make it more flexible to match partial messages
    const searchText = msg.toLowerCase().includes('deletado') || msg.toLowerCase().includes('deletada')
        ? 'deletad' // Match both "deletado" and "deletada"
        : msg;

    await page.waitForFunction(
        (text: string) => {
            const alerts = Array.from(document.querySelectorAll('.MuiAlert-root'));
            return alerts.some(alert => {
                const alertText = alert.textContent?.toLowerCase() || '';
                return alertText.includes(text.toLowerCase());
            });
        },
        { timeout: 10000 },
        searchText
    );
});

Then('the exam {string} does not appear in the list of registered exams', async function (title: string) {
    await page.waitForSelector('[data-testid="exam-table"]');
    const examExists = await page.$(`[data-testid="exam-table"] [data-testid="exam-row-${title}"]`);
    expect(examExists).toBeFalsy();
});

Then('the exam {string} is no longer in the list of registered exams', async function (title: string) {
    await page.waitForSelector('[data-testid="exam-table"]');
    const examExists = await page.$(`[data-testid="exam-table"] [data-testid="exam-row-${title}"]`);
    expect(examExists).toBeFalsy();
});

Then('the system registers the exam {string} successfully', async function (title: string) {
    await page.waitForSelector('[data-testid="exam-table"]', { timeout: 5000 });
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
    await page.click('[data-testid="exam-dropdown"]');

    const selector = `[data-testid="dropdown-item-${title}"]`;

    // Esperar o item aparecer
    await page.waitForSelector(selector, { timeout: 5000 });

    const exists = await page.$(selector);
    expect(exists).toBeTruthy();
});
