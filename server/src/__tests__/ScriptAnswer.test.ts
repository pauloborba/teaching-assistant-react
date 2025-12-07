import { ScriptAnswer } from "../models/ScriptAnswer";
import { Student } from "../models/Student";
import { Task } from "../models/Task";
import { TaskAnswer } from "../models/TaskAnswer";
import { Grade } from "../models/Evaluation";

describe("ScriptAnswer", () => {
  let student: Student;
  let script: ScriptAnswer;

  beforeEach(() => {
    student = new Student("John Doe", "12345678909", "john@example.com");
    script = new ScriptAnswer("sa1", student);
  });

  // ---------------------------------------------------------------
  test("constructor initializes fields", () => {
    expect(script.getId()).toBe("sa1");
    expect(script.answers.length).toBe(0);
  });

  // ---------------------------------------------------------------
  test("toJSON() returns correct structure", () => {
    const t1 = new Task("t1", "Example task");
    const ta1 = new TaskAnswer("a1", t1, "my answer", "MA");

    script.addAnswer(ta1);

    const json = script.toJSON();

    expect(json).toEqual({
      id: "sa1",
      student: {
        name: "John Doe",
        cpf: "123.456.789-09", // normalized by Student class
        email: "john@example.com",
      },
      answers: [
        {
          id: "a1",
          task: {
            id: "t1",
            statement: "Example task",
          },
          answer: "my answer",
          grade: "MA",
          comments: undefined,
        },
      ],
      grade: undefined,
    });
  });

  // ---------------------------------------------------------------
  test("addAnswer() adds new answer", () => {
    const answer = new TaskAnswer("a1", new Task("t1", "task1"));
    script.addAnswer(answer);

    expect(script.answers.length).toBe(1);
    expect(script.answers[0]).toBe(answer);
  });

  test("addAnswer() throws when adding duplicate task", () => {
    const t1 = new Task("t1", "task1");
    const answer1 = new TaskAnswer("a1", t1);
    const answer2 = new TaskAnswer("a2", t1);

    script.addAnswer(answer1);

    expect(() => script.addAnswer(answer2)).toThrow("Answer for task already in script");
  });

  // ---------------------------------------------------------------
  test("findAnswerByTaskId() returns correct answer", () => {
    const a1 = new TaskAnswer("a1", new Task("t1", "task1"));
    const a2 = new TaskAnswer("a2", new Task("t2", "task2"));

    script.addAnswer(a1);
    script.addAnswer(a2);

    expect(script.findAnswerByTaskId("t2")).toBe(a2);
    expect(script.findAnswerByTaskId("missing")).toBeUndefined();
  });

  // ---------------------------------------------------------------
  test("removeAnswer() removes existing answer", () => {
    const a1 = new TaskAnswer("a1", new Task("t1", "t1"));
    script.addAnswer(a1);
    expect(script.answers.length).toBe(1);

    const removed = script.removeAnswer("t1");

    expect(removed).toBe(true);
    expect(script.answers.length).toBe(0);
  });

  test("removeAnswer() returns false if answer not found", () => {
    const removed = script.removeAnswer("missing");
    expect(removed).toBe(false);
  });

  // ---------------------------------------------------------------
  describe("grade distribution", () => {
    test("getGradeDistribution counts correctly", () => {
      script.addAnswer(new TaskAnswer("a1", new Task("1", "x"), "a", "MA"));
      script.addAnswer(new TaskAnswer("a2", new Task("2", "x"), "a", "MA"));
      script.addAnswer(new TaskAnswer("a3", new Task("3", "x"), "a", "MPA"));
      script.addAnswer(new TaskAnswer("a4", new Task("4", "x"), "a", "MANA"));

      const dist = script.getGradeDistribution();

      expect(dist).toEqual({
        MA: 2,
        MPA: 1,
        MANA: 1,
      });
    });

  });
});
