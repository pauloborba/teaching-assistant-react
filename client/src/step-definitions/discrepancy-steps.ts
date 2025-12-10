import { Given, When, Then, Before, After, setDefaultTimeout } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';
import expect from 'expect';

setDefaultTimeout(30 * 1000);

let browser: Browser;
let page: Page;
const serverUrl = 'http://localhost:3005';
const baseUrl = 'http://localhost:3004';

// --- DADOS CRIADOS NO TESTE ---
let createdStudents: string[] = [];
let createdClasses: string[] = [];

// --- HELPERS API ---
async function apiPOST(url: string, body: any) {
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    return res.json();
}

async function apiDELETE(url: string) {
    await fetch(url, { method: 'DELETE' });
}

async function enroll(classId: string, cpf: string) {
    await apiPOST(`${serverUrl}/api/classes/${classId}/enroll`, {
        studentCPF: cpf
    });
}

async function evalPUT(classId: string, cpf: string, goal: string, grade: string) {
    await fetch(
        `${serverUrl}/api/classes/${classId}/enrollments/${cpf}/evaluation`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal, grade })
        }
    );
}

async function selfPUT(classId: string, cpf: string, goal: string, grade: string) {
    await fetch(
        `${serverUrl}/api/classes/${classId}/enrollments/${cpf}/selfEvaluation`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal, grade })
        }
    );
}

// --- SETUP DO BROWSER ---
Before({ tags: '@discrepancy' }, async function () {
    browser = await launch({
        headless: false,
        slowMo: 40
    });

    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
});

// Fechando browser
After({ tags: '@discrepancy' }, async function () {
    if (browser) await browser.close();
});

// --- LIMPEZA DOS DADOS DO BACKEND APÓS OS TESTES ---
After({ tags: '@discrepancy' }, async function () {
    const base = `${serverUrl}/api`;

    for (const classId of createdClasses) {
        await apiDELETE(`${base}/classes/${classId}`);
    }

    for (const cpf of createdStudents) {
        await apiDELETE(`${base}/students/${cpf}`);
    }

    createdClasses = [];
    createdStudents = [];
});

// --- AUTENTICAÇÃO ---
Given('I am authenticated as a professor', async function () {
    // autenticacao mockada
    await page;
});

// --- CARREGAMENTO DE DADOS ---
Given('all evaluations and self-evaluations have been loaded', async function () {
    const base = `${serverUrl}/api`;

    // 1. Criar alunos
    const A = await apiPOST(`${base}/students`, {
        name: 'Aluno A',
        cpf: '11111111111',
        email: 'a@test.com'
    });

    const B = await apiPOST(`${base}/students`, {
        name: 'Aluno B',
        cpf: '22222222222',
        email: 'b@test.com'
    });

    createdStudents.push(A.cpf, B.cpf);

    // 2. TURMA 1 — sem discrepância
    const turma1 = await apiPOST(`${base}/classes`, {
        topic: 'Turma Sem Discrepancia',
        semester: 1,
        year: 2025
    });
    createdClasses.push(turma1.id);

    await enroll(turma1.id, A.cpf);
    await enroll(turma1.id, B.cpf);

    const goals = ["Requirements",
        "Configuration Management",
        "Project Management",
        "Design",
        "Tests",
        "Refactoring"];

    // aluno A e B sem discrepância
    for (const goal of goals) {
        await evalPUT(turma1.id, A.cpf, goal, 'MA');
        await selfPUT(turma1.id, A.cpf, goal, 'MA');

        await evalPUT(turma1.id, B.cpf, goal, 'MPA');
        await selfPUT(turma1.id, B.cpf, goal, 'MPA');
    }

    // 3. TURMA 2 — com discrepâncias
    const turma2 = await apiPOST(`${base}/classes`, {
        topic: 'Turma Com Discrepancia',
        semester: 1,
        year: 2025
    });
    createdClasses.push(turma2.id);

    await enroll(turma2.id, A.cpf);
    await enroll(turma2.id, B.cpf);

    // ALUNO A → mais de 25%
    await evalPUT(turma2.id, A.cpf, "Requirements", "MA");
    await selfPUT(turma2.id, A.cpf, "Requirements", "MANA");

    // Project Management -> discrepante
    await evalPUT(turma2.id, A.cpf, "Project Management", "MA");
    await selfPUT(turma2.id, A.cpf, "Project Management", "MPA");

    // Tests -> discrepante
    await evalPUT(turma2.id, A.cpf, "Tests", "MA");
    await selfPUT(turma2.id, A.cpf, "Tests", "MANA");

    // As outras metas sem discrepância
    await evalPUT(turma2.id, A.cpf, "Configuration Management", "MA");
    await selfPUT(turma2.id, A.cpf, "Configuration Management", "MA");

    await evalPUT(turma2.id, A.cpf, "Design", "MA");
    await selfPUT(turma2.id, A.cpf, "Design", "MA");

    await evalPUT(turma2.id, A.cpf, "Refactoring", "MA");
    await selfPUT(turma2.id, A.cpf, "Refactoring", "MA");

    // -------- ALUNO B (< 25%) --------
    // Requirements -> discrepante (1 de 6 metas)
    await evalPUT(turma2.id, B.cpf, "Requirements", "MA");
    await selfPUT(turma2.id, B.cpf, "Requirements", "MPA");

    // Restante sem discrepância
    await evalPUT(turma2.id, B.cpf, "Configuration Management", "MPA");
    await selfPUT(turma2.id, B.cpf, "Configuration Management", "MPA");

    await evalPUT(turma2.id, B.cpf, "Project Management", "MA");
    await selfPUT(turma2.id, B.cpf, "Project Management", "MA");

    await evalPUT(turma2.id, B.cpf, "Design", "MA");
    await selfPUT(turma2.id, B.cpf, "Design", "MA");

    await evalPUT(turma2.id, B.cpf, "Tests", "MPA");
    await selfPUT(turma2.id, B.cpf, "Tests", "MPA");

    await evalPUT(turma2.id, B.cpf, "Refactoring", "MA");
    await selfPUT(turma2.id, B.cpf, "Refactoring", "MA");

    await page;
});

Given('I am on the self-evaluation page', async function () {
    await page.goto(`${baseUrl}/self-evaluation`);
    await page.waitForSelector('[data-testid="self-evaluation-page"]');
});

Given('I am on the comparison page', async function () {
    await page.goto(`${baseUrl}/comparison`);
    await page.waitForSelector('[data-testid="comparison-page"]');
});

Given('Turma1 is selected', async function () {
    await page.waitForSelector('[data-testid="class-select"]');
    await page.select('[data-testid="class-select"]', 'Turma Sem Discrepancia');
    await page.waitForSelector('[data-testid="student-table"]');
});

Given('Turma2 is selected', async function () {
    await page.waitForSelector('[data-testid="class-select"]');
    await page.select('[data-testid="class-select"]', 'Turma Com Discrepancia');
    await page.waitForSelector('[data-testid="student-table"]');
});

Given('there are no students with self-evaluation discrepancies', async function () {
    await page;
});

When('the student list is displayed', async function () {
    await page.waitForSelector('[data-testid="student-table"]');
});

Then('I should see the student list without any discrepancy markings', async function () {
    const badges = await page.$$('[data-testid^="discrepancy-student-badge"]');
    expect(badges.length).toBe(0);
});

Given(
    'students A and B have goals where their self-evaluations are higher than the teacher’s evaluations',
    async function () {
        await page.waitForSelector('[data-testid="student-table"]');
    }
);

Then(
    'I should see the student list with discrepancy markings on the discrepant goals of students A and B',
    async function () {
        const goalBadges = await page.$$('[data-testid^="discrepancy-goal-badge"]');
        expect(goalBadges.length).toBeGreaterThan(0);
    }
);

Given(
    'student A has the {string} goal highlighted as discrepant',
    async function (goalName: string) {
        await page.waitForSelector(`[data-testid="discrepancy-goal-badge-${goalName}"]`);
    }
);

When('I view the goal details', async function () {
    const btn = await page.$('[data-testid^="discrepancy-goal-details"]');
    expect(btn).toBeTruthy();

    await btn!.click();

    await page.waitForSelector('[data-testid="goal-details-modal"]');
});

Then('I should see the teacher’s evaluation for that goal', async function () {
    const text = await page.$eval(
        '[data-testid="goal-details-teacher-eval"]',
        el => el.textContent
    );
    expect(text).toBeTruthy();
});

Given('student A has no discrepancies', async function () {
    await page;
});

Then(
    'I should see the student, their evaluations, and self-evaluations, all without highlighting',
    async function () {
        const highlights = await page.$$('[data-testid^="discrepancy-goal-badge"]');
        expect(highlights.length).toBe(0);
    }
);

Given(
    'student A has more than 25% of goals marked as discrepant',
    async function () {
        await page.waitForSelector('[data-testid="student-table"]');
    }
);

Then(
    'I should see the student highlighted, along with their evaluations and highlighted self-evaluations',
    async function () {
        const studentHighlight = await page.$('[data-testid="discrepancy-student-badge-A"]');
        expect(studentHighlight).toBeTruthy();

        const goalHighlights = await page.$$('[data-testid^="discrepancy-goal-badge"]');
        expect(goalHighlights.length).toBeGreaterThan(0);
    }
);

Given(
    'student B has less than 25% of goals marked as discrepant',
    async function () {
        await page;
    }
);

Then(
    'I should see the evaluations and the highlighted self-evaluations, but the student themselves should not be highlighted',
    async function () {
        const studentBadge = await page.$('[data-testid="discrepancy-student-badge-A"]');
        expect(studentBadge).toBe(null);

        const goalHighlights = await page.$$('[data-testid^="discrepancy-goal-badge"]');
        expect(goalHighlights.length).toBeGreaterThan(0);
    }
);

Given('student A has a discrepancy marking', async function () {
    const badge = await page.$('[data-testid="discrepancy-student-badge-A"]');
    expect(badge).toBeTruthy();
});

When(`I view student A's details`, async function () {
    const row = await page.$('[data-testid="discrepancy-student-row-A"]');
    expect(row).toBeTruthy();

    const btn = await row!.$('[data-testid="discrepancy-details-button"]');
    expect(btn).toBeTruthy();

    await btn!.click();

    await page.waitForSelector('[data-testid="discrepancy-percentage-value"]');
});

Then('I should see the discrepancy percentage', async function () {
    const value = await page.$eval(
        '[data-testid="discrepancy-percentage-value"]',
        el => el.textContent?.trim()
    );

    expect(value).toMatch(/\d+%/);
});
