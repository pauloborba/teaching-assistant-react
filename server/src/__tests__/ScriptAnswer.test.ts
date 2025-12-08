import { ScriptAnswer } from "../models/ScriptAnswer";
import { TaskAnswer } from "../models/TaskAnswer";
import { Grade } from "../models/Evaluation";

describe("ScriptAnswer", () => {
  let script: ScriptAnswer;

  beforeEach(() => {
    script = new ScriptAnswer("sa1", "script1", "student123");
  });

  // ---------------------------------------------------------------
  test("constructor initializes fields", () => {
    expect(script.getId()).toBe("sa1");
    expect(script.getScriptId()).toBe("script1");
    expect(script.answers.length).toBe(0);
  });

  // ---------------------------------------------------------------
  test("toJSON() returns correct structure", () => {
    const ta1 = new TaskAnswer("a1", "t1", "my answer", "MA");

    script.addAnswer(ta1);

    const json = script.toJSON();

    expect(json).toEqual({
      id: "sa1",
      scriptId: "script1",
      student: "student123",
      answers: [
        {
          id: "a1",
          task: "t1",
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
    const answer = new TaskAnswer("a1", "t1");
    script.addAnswer(answer);

    expect(script.answers.length).toBe(1);
    expect(script.answers[0]).toBe(answer);
  });

  test("addAnswer() throws when adding duplicate task", () => {
    const answer1 = new TaskAnswer("a1", "t1");
    const answer2 = new TaskAnswer("a2", "t1");

    script.addAnswer(answer1);

    expect(() => script.addAnswer(answer2)).toThrow("Answer for task already in script");
  });

  // ---------------------------------------------------------------
  test("findAnswerByTaskId() returns correct answer", () => {
    const a1 = new TaskAnswer("a1", "t1");
    const a2 = new TaskAnswer("a2", "t2");

    script.addAnswer(a1);
    script.addAnswer(a2);

    expect(script.findAnswerByTaskId("t2")).toBe(a2);
    expect(script.findAnswerByTaskId("missing")).toBeUndefined();
  });

  // ---------------------------------------------------------------
  test("removeAnswer() removes existing answer", () => {
    const a1 = new TaskAnswer("a1", "t1");
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
      script.addAnswer(new TaskAnswer("a1", "t1", "a", "MA"));
      script.addAnswer(new TaskAnswer("a2", "t2", "a", "MA"));
      script.addAnswer(new TaskAnswer("a3", "t3", "a", "MPA"));
      script.addAnswer(new TaskAnswer("a4", "t4", "a", "MANA"));

      const dist = script.getGradeDistribution();

      expect(dist).toEqual({
        MA: 2,
        MPA: 1,
        MANA: 1,
      });
    });

    test("getNumberOfAnswersWithGrade throws on invalid grade", () => {
      expect(() => (script as any).getNumberOfAnswersWithGrade("INVALID"))
        .toThrow("Invalid grade");
    });
  });

  // ---------------------------------------------------------------
  describe("grade validation", () => {
    test("constructor throws when initialized with invalid grade", () => {
      expect(() => {
        new ScriptAnswer("bad", "script1", "student123", [], "INVALID" as Grade);
      }).toThrow("Invalid grade value");
    });

    test("updateGrade updates grade when valid", () => {
      script.updateGrade("MA");
      expect(script.grade).toBe("MA");

      script.updateGrade("MPA");
      expect(script.grade).toBe("MPA");

      script.updateGrade(undefined);
      expect(script.grade).toBeUndefined();
    });

    test("updateGrade throws on invalid grade", () => {
      expect(() => {
        script.updateGrade("WRONG" as Grade);
      }).toThrow("Invalid grade value");
    });
  });

  // ---------------------------------------------------------------
  describe("static methods", () => {
    test("fromJSON creates ScriptAnswer instance", () => {
      const json = {
        id: "sa1",
        scriptId: "script1",
        student: "student123",
        answers: [
          {
            id: "a1",
            task: "t1",
            answer: "test answer",
            grade: "MA",
            comments: "good",
          },
        ],
        grade: "MPA",
      };

      const script = ScriptAnswer.fromJSON(json);

      expect(script.getId()).toBe("sa1");
      expect(script.getScriptId()).toBe("script1");
      expect(script.answers.length).toBe(1);
      expect(script.grade).toBe("MPA");
    });
  });
});
