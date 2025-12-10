import { Browser, Page } from "puppeteer";
import expect from "expect";
import puppeteer from 'puppeteer';

jest.setTimeout(70000);

const baseUrl = "http://localhost:3004";

let browser: Browser;
let page: Page;

// Função para auxilixar na nevegacão por botões de acordo com o texto
async function clickByButtonText(text: string) {
    await page.waitForFunction(
        (label) => {
            return [...document.querySelectorAll("button")]
                .some(btn => btn.textContent?.trim() === label);
        },
        {},
        text
    );

    await page.evaluate((label) => {
        const buttons = [...document.querySelectorAll("button")];
        const btn = buttons.find(b => b.textContent?.trim() === label);
        if (!btn) throw new Error("Botão não encontrado: " + label);
        (btn as HTMLElement).click();
    }, text);
}

// Navegação entre as views de Evaluation 
async function goToEvaluation() {
    await page.waitForSelector('[data-testid="evaluations-tab"]');
    await page.click('[data-testid="evaluations-tab"]');
    await page.waitForSelector("tbody tr");
}

async function goToSelfEvaluationAfterSelectingClass() {
    await clickByButtonText("Self-Evaluations");
    await page.waitForSelector(".evaluation-matrix");
    await page.waitForSelector(".evaluation-table");
}

async function goToComparisonAfterSelectingClass() {
    await clickByButtonText("Comparison");
    await page.waitForSelector(".evaluation-matrix");
    await page.waitForSelector(".evaluation-table");
}

// Função para selecionar uma turma no dropdown
async function selectClassFromDropdown(topic: string, year: string, semester: string) {
    const visibleText = `${topic} (${year}/${semester})`;

    await page.waitForSelector("#classSelect");

    await page.evaluate((visibleText) => {
        const select = document.querySelector("#classSelect") as HTMLSelectElement;
        const option = Array.from(select.options).find(
            opt => opt.textContent?.trim() === visibleText
        );
        if (!option) {
            throw new Error(`Opção "${visibleText}" não encontrada no select`);
        }

        select.value = option.value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
    }, visibleText);

    await page.waitForNetworkIdle({ idleTime: 300, timeout: 5000 });
}

beforeAll(async () => {
    browser = await puppeteer.launch({
        headless: false,
        slowMo: 25
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    await page.goto(baseUrl);
});

afterAll(async () => {
    await browser.close();
});

describe("Feature: Discrepancy Visualization", () => {

    test("Scenario 1 — Sem discrepâncias (Evaluation)", async () => {
        await goToEvaluation();
        await selectClassFromDropdown("Turma Sem Discrepancia", "2025", "1");
        await goToSelfEvaluationAfterSelectingClass();

        const icons = await page.$$("svg");
        expect(icons.length).toBe(0);
    });

    test("Scenario 2 — Com discrepâncias (Evaluation)", async () => {
        await goToEvaluation();
        await selectClassFromDropdown("Turma Com Discrepancia", "2025", "1");
        await goToSelfEvaluationAfterSelectingClass()

        const tooltipIcons = await page.$$("svg");
        expect(tooltipIcons.length).toBeGreaterThan(0);
    });

    test("Scenario 3 — Tooltip aparece ao passar mouse no InfoButton", async () => {
        await goToEvaluation();
        await selectClassFromDropdown("Turma Com Discrepancia", "2025", "1");
        await goToSelfEvaluationAfterSelectingClass();
        const tooltipIcons = await page.$$("svg");
        expect(tooltipIcons.length).toBeGreaterThan(0);
        const infoButton = tooltipIcons[0];

        await infoButton!.hover();

        const tooltip = await page.waitForFunction(() => {
            return !!document.querySelector("div[style*='position: absolute']");
        }, { timeout: 2000 });

        expect(tooltip).toBeTruthy();
    });

    test("Scenario 4 — Comparison sem discrepância", async () => {
        await goToEvaluation();
        await selectClassFromDropdown("Turma Sem Discrepancia", "2025", "1");
        await goToComparisonAfterSelectingClass();

        const tooltipIcons = await page.$$("svg");
        expect(tooltipIcons.length).toBe(0);
    });

    test("Scenario 5 — Estudante A é destacado (>25%) (Self-Evaluations)", async () => {
        await goToEvaluation();
        await selectClassFromDropdown("Turma Com Discrepancia", "2025", "1");
        await goToSelfEvaluationAfterSelectingClass();

        // Procura a linha do estudante A
        const rows = await page.$$(".evaluation-table tbody tr");
        let rowA = null;
        for (const row of rows) {
            const text = await row.evaluate(r => r.textContent || "");
            if (text.includes("A")) {
                rowA = row;
                break;
            }
        }
        expect(rowA).not.toBeNull();

        const icons = await rowA!.$$("svg");
        expect(icons.length).toBeGreaterThan(0);
    });

    test("Scenario 6 — Estudante B <25% → apenas goals destacados", async () => {
        await goToEvaluation();
        await selectClassFromDropdown("Turma Com Discrepancia", "2025", "1");
        await goToSelfEvaluationAfterSelectingClass();

        // Procura a linha do estudante B
        const rows = await page.$$(".evaluation-table tbody tr");
        let rowB = null;
        for (const row of rows) {
            const text = await row.evaluate(r => r.textContent || "");
            if (text.includes("B")) {
                rowB = row;
                break;
            }
        }
        expect(rowB).not.toBeNull();

        const icons = await rowB!.$$("svg");
        expect(icons.length).toBe(1);
    });

    test("Scenario 7 — Tooltip mostra porcentagem real (Self-Evaluations)", async () => {
        await goToEvaluation();
        await selectClassFromDropdown("Turma Com Discrepancia", "2025", "1");
        await goToComparisonAfterSelectingClass();

        // Linha do estudante A
        const rows = await page.$$(".evaluation-table tbody tr");
        let rowA = null;
        for (const row of rows) {
            const text = await row.evaluate(r => r.textContent || "");
            if (text.includes("A")) {
                rowA = row;
                break;
            }
        }
        expect(rowA).not.toBeNull();

        const infoButton = await rowA!.$("svg");
        expect(infoButton).not.toBeNull();

        await infoButton!.hover();

        const tooltip = await page.waitForFunction(() => {
            return !!document.querySelector("div[style*='position: absolute']");
        }, { timeout: 2000 });
        expect(tooltip).toBeTruthy();

        const tooltipText = await page.evaluate(() => {
            const div = document.querySelector("div[style*='position: absolute']");
            return div?.textContent?.trim() || "";
        });
        expect(tooltipText).toMatch(/\d+%/);
    });

});


