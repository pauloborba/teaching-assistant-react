import { defineFeature, loadFeature } from "jest-cucumber";
import expect from "expect";
import path from "path";

const feature = loadFeature(
    path.join(process.cwd(), "client/src/features/server-discrepancy.feature")
);

function compareGoal(teacher: string, self: string): boolean {
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

    const percentage = total === 0 ? 0 : Math.round((discrepant / total) * 100);

    return {
        percentage,
        highlight: percentage > 25,
    };
}

defineFeature(feature, (test) => {
    let goals: string[] = [];
    let studentEval: Record<string, string> = {};
    let studentSelf: Record<string, string> = {};
    let result: any;

    const resetStudent = () => {
        studentEval = {};
        studentSelf = {};
    };

    // --- Cenários ---
    test("High Discrepancy Percentage (Above Threshold)", ({ given, when, then, and }) => {
        // Background
        given("the core evaluation service is running", () => { });
        and("the discrepancy threshold is set to 25%", () => { });
        and("all students data is prepared", () => {
            goals = [
                "Requirements",
                "Configuration Management",
                "Project Management",
                "Design",
                "Tests",
                "Refactoring",
            ];
        });

        // Cenário
        given("student A data is prepared in the system", () => resetStudent());
        and(
            "the calculated discrepancy status for goals 'Configuration Management' and 'Project Management' is TRUE (discrepant)",
            () => {
                studentEval["Configuration Management"] = "MA";
                studentSelf["Configuration Management"] = "MANA";

                studentEval["Project Management"] = "MA";
                studentSelf["Project Management"] = "MPA";
            }
        );
        and("the calculated discrepancy status for the remaining goals is FALSE (not discrepant)", () => {
            for (const goal of goals) {
                if (!studentEval[goal]) {
                    studentEval[goal] = "MA";
                    studentSelf[goal] = "MA";
                }
            }
        });

        when("the function getStudentDiscrepancyInfo is called for student A", () => {
            result = getStudentDiscrepancyInfo(goals, studentEval, studentSelf);
        });

        then("the function should return the total discrepancy percentage as 33%", () => {
            expect(result.percentage).toBe(33);
        });
        and("the function should return the overall discrepancy flag as TRUE", () => {
            expect(result.highlight).toBe(true);
        });
    });

    test("Low Discrepancy Percentage (Below Threshold)", ({ given, when, then, and }) => {
        // Background
        given("the core evaluation service is running", () => { });
        and("the discrepancy threshold is set to 25%", () => { });
        and("all students data is prepared", () => {
            goals = [
                "Requirements",
                "Configuration Management",
                "Project Management",
                "Design",
                "Tests",
                "Refactoring",
            ];
        });

        // Cenário
        given("student B data is prepared in the system", () => resetStudent());
        and("the calculated discrepancy status for goal 'Configuration Management' is TRUE (discrepant)", () => {
            studentEval["Configuration Management"] = "MA";
            studentSelf["Configuration Management"] = "MANA";
        });
        and("the calculated discrepancy status for the remaining goals is FALSE (not discrepant)", () => {
            for (const goal of goals) {
                if (!studentEval[goal]) {
                    studentEval[goal] = "MA";
                    studentSelf[goal] = "MA";
                }
            }
        });

        when("the function getStudentDiscrepancyInfo is called for student B", () => {
            result = getStudentDiscrepancyInfo(goals, studentEval, studentSelf);
        });

        then("the function should return the total discrepancy percentage as 17%", () => {
            expect(result.percentage).toBe(17);
        });
        and("the function should return the overall discrepancy flag as FALSE", () => {
            expect(result.highlight).toBe(false);
        });
    });

    test("Zero Discrepancy Percentage", ({ given, when, then, and }) => {
        // Background
        given("the core evaluation service is running", () => { });
        and("the discrepancy threshold is set to 25%", () => { });
        and("all students data is prepared", () => {
            goals = [
                "Requirements",
                "Configuration Management",
                "Project Management",
                "Design",
                "Tests",
                "Refactoring",
            ];
        });

        // Cenário
        given("student C data is prepared in the system", () => resetStudent());
        and("the student has no goals marked as discrepant", () => {
            for (const goal of goals) {
                studentEval[goal] = "MA";
                studentSelf[goal] = "MA";
            }
        });

        when("the function getStudentDiscrepancyInfo is called for student C", () => {
            result = getStudentDiscrepancyInfo(goals, studentEval, studentSelf);
        });

        then("the function should return the total discrepancy percentage as 0%", () => {
            expect(result.percentage).toBe(0);
        });
        and("the function should return the overall discrepancy flag as FALSE", () => {
            expect(result.highlight).toBe(false);
        });
    });

    test("Goal Comparison Returns Discrepant (TRUE)", ({ given, when, then, and }) => {
        // Background
        given("the core evaluation service is running", () => { });
        and("the discrepancy threshold is set to 25%", () => { });
        and("all students data is prepared", () => {
            goals = [
                "Requirements",
                "Configuration Management",
                "Project Management",
                "Design",
                "Tests",
                "Refactoring",
            ];
        });

        // Cenário
        given(
            "the goal 'Configuration Management' has teacher evaluation 'MA' and self-evaluation 'MPA'",
            () => {
                studentEval = { "Configuration Management": "MA" };
                studentSelf = { "Configuration Management": "MPA" };
            }
        );

        when("the function compareGoal is called for this goal", () => {
            result = compareGoal(
                Object.values(studentEval)[0],
                Object.values(studentSelf)[0]
            );
        });

        then("the function should return TRUE", () => {
            expect(result).toBe(true);
        });
    });

    test("Goal Comparison Returns Non-Discrepant (FALSE)", ({ given, when, then, and }) => {
        // Background
        given("the core evaluation service is running", () => { });
        and("the discrepancy threshold is set to 25%", () => { });
        and("all students data is prepared", () => {
            goals = [
                "Requirements",
                "Configuration Management",
                "Project Management",
                "Design",
                "Tests",
                "Refactoring",
            ];
        });

        // Cenário
        given(
            "the goal 'Configuration Management' has teacher evaluation 'MPA' and self-evaluation 'MPA'",
            () => {
                studentEval = { "Configuration Management": "MPA" };
                studentSelf = { "Configuration Management": "MPA" };
            }
        );

        when("the function compareGoal is called for this goal", () => {
            result = compareGoal(
                Object.values(studentEval)[0],
                Object.values(studentSelf)[0]
            );
        });

        then("the function should return FALSE", () => {
            expect(result).toBe(false);
        });
    });
});
