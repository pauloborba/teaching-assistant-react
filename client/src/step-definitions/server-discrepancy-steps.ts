import { Given, When, Then } from "@cucumber/cucumber";
import expect from "expect";

// Funções extraídas do componente Evaluation.tsx
function compareGoal(teacher: string, self: string) {
    return teacher !== self;
}

function getStudentDiscrepancyInfo(
    evaluationGoals: string[],
    studentEvaluations: Record<string, string>,
    studentSelfEvaluations: Record<string, string>
) {
    let total = 0;
    let discrepant = 0;

    for (const goal of evaluationGoals) {
        const teacherEval = studentEvaluations[goal] || "";
        const selfEval = studentSelfEvaluations[goal] || "";

        if (teacherEval || selfEval) {
            total++;
            if (compareGoal(teacherEval, selfEval)) discrepant++;
        }
    }

    const percentage =
        total === 0 ? 0 : Math.round((discrepant / total) * 100);

    return {
        percentage,
        highlight: percentage > 25,
    };
}

// --- STATE ---
let goals: string[] = [];
let studentEval: Record<string, string> = {};
let studentSelf: Record<string, string> = {};
let result: any;

// --- BACKGROUND ---

Given("all students data is prepared", function () {
    goals = [
        "Requirements",
        "Configuration Management",
        "Project Management",
        "Design",
        "Tests",
        "Refactoring"
    ];
});

Given("student {word} data is prepared in the system", function (studentName: string) {
    // Zera todas as avaliações do estudante
    studentEval = {};
    studentSelf = {};
});

// Mantido exatamente igual
Given(
    "the calculated discrepancy status for goals '{string}' and '{string}' is TRUE (discrepant)",
    function (g1: string, g2: string) {
        studentEval[g1] = "MA"; studentSelf[g1] = "MANA";
        studentEval[g2] = "MA"; studentSelf[g2] = "MPA";
    }
);

Given("the calculated discrepancy status for the remaining goals is FALSE (not discrepant)", function () {
    for (const goal of goals) {
        if (!studentEval[goal]) {
            studentEval[goal] = "MA";
            studentSelf[goal] = "MA";
        }
    }
});

When("the function getStudentDiscrepancyInfo is called for student {word}", function (studentName: string) {
    result = getStudentDiscrepancyInfo(goals, studentEval, studentSelf);
});

Then("the function should return the total discrepancy percentage as 33%", function () {
    expect(result.percentage).toBe(33);
});

Then("the function should return the overall discrepancy flag as TRUE", function () {
    expect(result.highlight).toBe(true);
});


Given(
    "the calculated discrepancy status for goal '{string}' is TRUE (discrepant)",
    function (g1: string) {
        studentEval[g1] = "MA";
        studentSelf[g1] = "MANA";
    }
);

Then("the function should return the total discrepancy percentage as 17%", function () {
    expect(result.percentage).toBe(17);
});

Then("the function should return the overall discrepancy flag as FALSE", function () {
    expect(result.highlight).toBe(false);
});

Given("the student has no goals marked as discrepant", function () {
    for (const goal of goals) {
        studentEval[goal] = "MA";
        studentSelf[goal] = "MA";
    }
});

Then("the function should return the total discrepancy percentage as 0%", function () {
    expect(result.percentage).toBe(0);
});

Given(
    "the goal '{string}' has teacher evaluation '{string}' and self-evaluation '{string}'",
    function (goal: string, teacher: string, self: string) {
        studentEval = { [goal]: teacher };
        studentSelf = { [goal]: self };
    }
);

When("the function compareGoal is called for this goal", function () {
    result = compareGoal(
        Object.values(studentEval)[0],
        Object.values(studentSelf)[0]
    );
});

Then("the function should return TRUE", function () {
    expect(result).toBe(true);
});

Then("the function should return FALSE", function () {
    expect(result).toBe(false);
});
