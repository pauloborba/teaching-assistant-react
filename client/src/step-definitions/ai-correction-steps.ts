import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import expect from 'expect';
import { Page, Browser, launch } from 'puppeteer';

// Set default timeout for all steps
setDefaultTimeout(30 * 1000); // 30 seconds

const baseUrl = 'http://localhost:3004';

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let browser: Browser;
let page: Page;
let examTitleGlobal: string;

Before({ tags: '@gui or @ai-correction' }, async function () {
    browser = await launch({
        headless: false, // Set to true for CI/CD
        slowMo: 50 // Slow down actions for visibility
    });
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set up request interception (needed for network failure scenarios)
    // By default, all requests go to the real server
    await page.setRequestInterception(true);
    
    page.on('request', async (request) => {
        // By default, let all requests go to the real server
        // Interception will be overridden in specific scenarios (e.g., network failure)
        request.continue();
    });
});

After({ tags: '@gui or @ai-correction' }, async function () {
    if (browser) {
        await browser.close();
    }
});

/* ------------------------------------------------------------
   GIVEN
-------------------------------------------------------------*/

Given('teacher {string} is viewing the exam {string}', async function (teacherName: string, examTitle: string) {
    examTitleGlobal = examTitle;
    
    // Navegar para a página inicial
    await page.goto(baseUrl);
    await page.waitForSelector('h1');
    
    // Navegar para a aba de classes
    await page.waitForSelector('[data-testid="classes-tab"]');
    await page.click('[data-testid="classes-tab"]');
    await page.waitForSelector('[data-testid="classes-container"]');
    
    // Clicar no primeiro botão de exames disponível (assumindo que existe pelo menos uma turma)
    await page.waitForSelector('[data-testid^="exams-btn-"]');
    const firstClassButton = await page.$('[data-testid^="exams-btn-"]');
    expect(firstClassButton).toBeTruthy();
    
    const classId = await page.evaluate(
        el => el!.getAttribute('data-testid')!.replace('exams-btn-', ''),
        firstClassButton
    );
    
    // Navegar para a página de exames da turma
    await page.click(`[data-testid="exams-btn-${classId}"]`);
    
    // Aguardar a página carregar
    await page.waitForSelector('[data-testid="exam-dropdown"]', { timeout: 10000 });
    
    // Selecionar o exame no dropdown
    await page.click('[data-testid="exam-dropdown"]');
    await page.waitForSelector(`[data-testid="dropdown-item-${examTitle}"]`, { timeout: 5000 });
    await page.click(`[data-testid="dropdown-item-${examTitle}"]`);
    
    // Aguardar o exame ser selecionado (o botão de correção deve estar habilitado)
    await page.waitForSelector('[data-testid="correct-open-questions-button"]', { timeout: 5000 });
});

Given('the exam {string} has no responses', async function (examTitle: string) {
    // Esta step definition é apenas uma marcação para o cenário
    // A configuração real de dados sem respostas deve ser feita no backend/test setup
    // Por enquanto, apenas aguardamos um pouco para garantir que o estado está configurado
    await wait(500);
});

/* ------------------------------------------------------------
   WHEN
-------------------------------------------------------------*/

When('the teacher asks the system to grade the open questions in the exam {string}', async function (examTitle: string) {
    // Clicar no botão "Corrigir Abertas"
    await page.waitForSelector('[data-testid="correct-open-questions-button"]', { timeout: 5000 });
    await page.click('[data-testid="correct-open-questions-button"]');
    
    // Aguardar o modal de seleção de modelo aparecer
    await page.waitForSelector('[data-testid="model-selection-dropdown"]', { timeout: 5000 });
});

When('the teacher selects the model {string}', async function (modelName: string) {
    // Clicar no dropdown de seleção de modelo
    await page.waitForSelector('[data-testid="model-selection-dropdown"]', { timeout: 5000 });
    await page.click('[data-testid="model-selection-dropdown"]');
    
    // Aguardar o item do modelo aparecer e clicar nele
    // O dropdown usa o mesmo padrão de data-testid
    await page.waitForSelector(`[data-testid="dropdown-item-${modelName}"]`, { timeout: 5000 });
    await page.click(`[data-testid="dropdown-item-${modelName}"]`);
});

When('the teacher confirms the selection', async function () {
    // Clicar no botão de confirmar
    await page.waitForSelector('[data-testid="model-selection-confirm-button"]', { timeout: 5000 });
    await page.click('[data-testid="model-selection-confirm-button"]');
});

When('the teacher asks the system to grade the open questions in the exam {string} without selecting any model', async function (examTitle: string) {
    // Clicar no botão "Corrigir Abertas"
    await page.waitForSelector('[data-testid="correct-open-questions-button"]', { timeout: 5000 });
    await page.click('[data-testid="correct-open-questions-button"]');
    
    // Aguardar o modal de seleção de modelo aparecer
    await page.waitForSelector('[data-testid="model-selection-dropdown"]', { timeout: 5000 });
    
    // Confirmar sem selecionar nenhum modelo (deixar o valor padrão "Selecione um modelo")
    await page.waitForSelector('[data-testid="model-selection-confirm-button"]', { timeout: 5000 });
    await page.click('[data-testid="model-selection-confirm-button"]');
});

/* ------------------------------------------------------------
   THEN
-------------------------------------------------------------*/

Then('the system initiates the exam correction process', async function () {
    // Verificar que o modal de seleção foi fechado (não está mais no DOM)
    await page.waitForFunction(
        () => {
            const modal = document.querySelector('[data-testid="model-selection-dropdown"]');
            return modal === null;
        },
        { timeout: 10000 }
    );
    
    // Verificar que o modal de sucesso aparece após a correção ser iniciada
    await page.waitForSelector('[data-testid="success-modal-content"]', { timeout: 10000 });
});

Then('a feedback message appears informing that the process was started with {string}', async function (modelName: string) {
    // Verificar que o modal de sucesso está visível
    await page.waitForSelector('[data-testid="success-modal-content"]', { timeout: 10000 });
    
    // Verificar que a mensagem contém o nome do modelo
    const modalContent = await page.$('[data-testid="success-modal-content"]');
    expect(modalContent).toBeTruthy();
    
    const modalText = await page.evaluate(el => el?.textContent || '', modalContent);
    expect(modalText).toContain(modelName);
});

Then('the feedback message includes the estimated correction completion time.', async function () {
    // Verificar que o tempo estimado está presente no modal
    await page.waitForSelector('[data-testid="success-modal-content"]', { timeout: 10000 });
    
    // Verificar que existe um elemento com "Tempo estimado"
    const hasEstimatedTime = await page.evaluate(() => {
        const modal = document.querySelector('[data-testid="success-modal-content"]');
        if (!modal) return false;
        const text = modal.textContent || '';
        return text.includes('Tempo estimado') && text.includes(':');
    });
    
    expect(hasEstimatedTime).toBe(true);
});

Then('the system displays a validation error message {string}', async function (errorMessage: string) {
    // Aguardar a mensagem de erro aparecer
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });
    
    // Verificar que a mensagem de erro contém o texto esperado
    const errorElement = await page.$('[data-testid="error-message"]');
    expect(errorElement).toBeTruthy();
    
    const errorText = await page.evaluate(el => el?.textContent || '', errorElement);
    expect(errorText).toContain(errorMessage);
});

Then('the system displays an error message {string}', async function (errorMessage: string) {
    // Aguardar a mensagem de erro aparecer
    // A mensagem pode aparecer em dois lugares:
    // 1. No div com data-testid="error-message" (errorMessage state)
    // 2. No componente Alert/Snackbar (alertConfig state)
    
    // Aguarda a requisição completar e o estado ser atualizado
    // Aguarda até que a mensagem de erro apareça na página
    let found = false;
    const maxAttempts = 20;
    let attempts = 0;
    
    while (!found && attempts < maxAttempts) {
        await wait(500);
        attempts++;
        
        // Tenta encontrar pelo data-testid primeiro (div de erro)
        try {
            const errorElement = await page.$('[data-testid="error-message"]');
            if (errorElement) {
                const errorText = await page.evaluate(el => el?.textContent || '', errorElement);
                if (errorText && errorText.includes(errorMessage)) {
                    found = true;
                    break;
                }
            }
        } catch (e) {
            // Continua tentando
        }
        
        // Procura no Snackbar do Material-UI
        try {
            const snackbar = await page.$('.MuiSnackbar-root');
            if (snackbar) {
                const snackbarText = await page.evaluate(el => el?.textContent || '', snackbar);
                if (snackbarText && snackbarText.includes(errorMessage)) {
                    found = true;
                    break;
                }
            }
        } catch (e) {
            // Continua tentando
        }
        
        // Procura no Alert component
        try {
            const alertElement = await page.$('[data-testid="alert-error"]');
            if (alertElement) {
                const alertText = await page.evaluate(el => el?.textContent || '', alertElement);
                if (alertText && alertText.includes(errorMessage)) {
                    found = true;
                    break;
                }
            }
        } catch (e) {
            // Continua tentando
        }
        
        // Procura em qualquer elemento visível que contenha a mensagem
        const pageText = await page.evaluate(() => document.body.textContent || '');
        if (pageText.includes(errorMessage)) {
            // Verifica se o elemento está visível
            const isVisible = await page.evaluate((text) => {
                const allElements = Array.from(document.querySelectorAll('*'));
                for (const element of allElements) {
                    const elementText = element.textContent || '';
                    if (elementText.includes(text)) {
                        const htmlElement = element as HTMLElement;
                        const style = window.getComputedStyle(htmlElement);
                        const isVisible = htmlElement.offsetParent !== null && 
                                         style.display !== 'none' &&
                                         style.visibility !== 'hidden' &&
                                         parseFloat(style.opacity) > 0;
                        if (isVisible) return true;
                    }
                }
                return false;
            }, errorMessage);
            
            if (isVisible) {
                found = true;
                break;
            }
        }
    }
    
    // Se não encontrou, tenta uma última vez com waitForFunction
    if (!found) {
        try {
            await page.waitForFunction(
                (text: string) => {
                    // Procura pelo data-testid="error-message"
                    const errorDivs = Array.from(document.querySelectorAll('[data-testid="error-message"]'));
                    for (const div of errorDivs) {
                        const divText = div.textContent || '';
                        if (divText.includes(text)) {
                            const htmlElement = div as HTMLElement;
                            const style = window.getComputedStyle(htmlElement);
                            const isVisible = htmlElement.offsetParent !== null && 
                                             style.display !== 'none' &&
                                             style.visibility !== 'hidden';
                            if (isVisible) return true;
                        }
                    }
                    
                    // Procura em Snackbars
                    const snackbars = Array.from(document.querySelectorAll('.MuiSnackbar-root'));
                    for (const snackbar of snackbars) {
                        const snackbarText = snackbar.textContent || '';
                        if (snackbarText.includes(text)) {
                            return true;
                        }
                    }
                    
                    return false;
                },
                { timeout: 10000 },
                errorMessage
            );
            found = true;
        } catch (e) {
            // Se ainda não encontrou, vamos verificar o que está na página
            const pageContent = await page.evaluate(() => document.body.textContent || '');
            const errorDivs = await page.evaluate(() => {
                const divs = Array.from(document.querySelectorAll('[data-testid="error-message"]'));
                return divs.map(div => div.textContent || '');
            });
            
            throw new Error(
                `Mensagem de erro "${errorMessage}" não foi encontrada na página. ` +
                `Conteúdo da página: ${pageContent.substring(0, 500)}. ` +
                `Elementos error-message encontrados: ${JSON.stringify(errorDivs)}`
            );
        }
    }
    
    expect(found).toBe(true);
});

Then('the correction process is not initiated', async function () {
    // Aguardar um pouco para garantir que o processo não foi iniciado
    await wait(1000);
    
    // Verificar que o modal de sucesso NÃO aparece
    const successModal = await page.$('[data-testid="success-modal-content"]');
    expect(successModal).toBeFalsy();
    
    // Verificar que o modal de seleção foi fechado (não está mais no DOM)
    const selectionModal = await page.$('[data-testid="model-selection-dropdown"]');
    expect(selectionModal).toBeFalsy();
});

Then('the system opens the popup to select the model', async function () {
    // Verificar que o modal de seleção de modelo foi aberto
    // O modal deve estar presente no DOM após clicar no botão
    await page.waitForSelector('[data-testid="model-selection-dropdown"]', { timeout: 5000 });
    
    // Verificar que o dropdown está presente
    const dropdown = await page.$('[data-testid="model-selection-dropdown"]');
    expect(dropdown).toBeTruthy();
});

Then('the popup to select the model is visible', async function () {
    // Verificar que o popup está visível na tela
    const dropdown = await page.$('[data-testid="model-selection-dropdown"]');
    expect(dropdown).toBeTruthy();
    
    // Verificar que o elemento está visível (não está oculto)
    const isVisible = await page.evaluate((element) => {
        if (!element) return false;
        const htmlElement = element as HTMLElement;
        const style = window.getComputedStyle(htmlElement);
        return htmlElement.offsetParent !== null && 
               style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               parseFloat(style.opacity) > 0;
    }, dropdown);
    
    expect(isVisible).toBe(true);
    
    // Verificar que o botão de confirmar também está presente e visível
    const confirmButton = await page.$('[data-testid="model-selection-confirm-button"]');
    expect(confirmButton).toBeTruthy();
});
