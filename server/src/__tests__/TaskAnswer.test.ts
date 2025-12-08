import { TaskAnswer } from "../models/TaskAnswer";
import { Grade } from "../models/Evaluation";

describe("TaskAnswer", () => {
  const taskId = "t1";

  // ---------------------------------------------------------------
  test("constructor initializes fields correctly", () => {
    const ta = new TaskAnswer("a1", taskId, "my answer", "MA", "good job");

    expect(ta.id).toBe("a1");
    expect(ta.task).toBe(taskId);
    expect(ta.answer).toBe("my answer");
    expect(ta.getGrade()).toBe("MA");
    expect(ta.comments).toBe("good job");
  });

  // ---------------------------------------------------------------
  test("constructor throws on invalid grade", () => {
    expect(() => {
      new TaskAnswer("a1", taskId, "ans", "INVALID" as Grade);
    }).toThrow("Invalid grade value");
  });

  test("constructor accepts undefined grade", () => {
    const ta = new TaskAnswer("a1", taskId, "x", undefined);
    expect(ta.getGrade()).toBeUndefined();
  });

  // ---------------------------------------------------------------
  test("getTaskId() returns task id", () => {
    const ta = new TaskAnswer("a1", taskId);
    expect(ta.getTaskId()).toBe(taskId);
  });

  // ---------------------------------------------------------------
  test("toJSON() returns correct structure", () => {
    const ta = new TaskAnswer("a1", taskId, "answer", "MPA");

    expect(ta.toJSON()).toEqual({
      id: "a1",
      task: taskId,
      answer: "answer",
      grade: "MPA",
      comments: undefined,
    });
  });

  test("toJSON() omits grade when undefined", () => {
    const ta = new TaskAnswer("a1", taskId, "ans", undefined);

    expect(ta.toJSON()).toEqual({
      id: "a1",
      task: taskId,
      answer: "ans",
      grade: undefined,
      comments: undefined,
    });
  });

  // ---------------------------------------------------------------
  describe("updateGrade()", () => {
    test("updates grade correctly", () => {
      const ta = new TaskAnswer("a1", taskId);
      ta.updateGrade("MANA");

      expect(ta.getGrade()).toBe("MANA");
    });

    test("removes grade when passed undefined", () => {
      const ta = new TaskAnswer("a1", taskId, "x", "MA");
      ta.updateGrade(undefined);

      expect(ta.getGrade()).toBeUndefined();
    });

    test("throws on invalid grade", () => {
      const ta = new TaskAnswer("a1", taskId);

      expect(() => ta.updateGrade("BAD" as Grade)).toThrow("Invalid grade value");
    });
  });

  // ---------------------------------------------------------------
  describe("update()", () => {
    test("updates answer", () => {
      const ta = new TaskAnswer("a1", taskId);
      ta.update({ answer: "new answer" });

      expect(ta.answer).toBe("new answer");
    });

    test("updates comments", () => {
      const ta = new TaskAnswer("a1", taskId);
      ta.update({ comments: "hello" });

      expect(ta.comments).toBe("hello");
    });

    test("updates grade", () => {
      const ta = new TaskAnswer("a1", taskId);
      ta.update({ grade: "MPA" });

      expect(ta.getGrade()).toBe("MPA");
    });

    test("throws on invalid grade", () => {
      const ta = new TaskAnswer("a1", taskId);

      expect(() => ta.update({ grade: "WRONG" as Grade }))
        .toThrow("Invalid grade value");
    });

    test("updates task", () => {
      const ta = new TaskAnswer("a1", taskId);
      ta.update({ task: "t2" });

      expect(ta.getTaskId()).toBe("t2");
      expect(ta.task).toBe("t2");
    });
  });

  // ---------------------------------------------------------------
  describe("fromJSON()", () => {
    test("creates TaskAnswer instance from JSON", () => {
      const json = {
        id: "a1",
        task: taskId,
        answer: "ans",
        grade: "MA",
        comments: "ok",
      };

      const ta = TaskAnswer.fromJSON(json);

      expect(ta.id).toBe("a1");
      expect(ta.answer).toBe("ans");
      expect(ta.getGrade()).toBe("MA");
      expect(ta.comments).toBe("ok");
      expect(ta.task).toBe(taskId);
    });
  });

  // ---------------------------------------------------------------
  test("getGrade() returns internal grade", () => {
    const ta = new TaskAnswer("a1", taskId, "ans", "MANA");
    expect(ta.getGrade()).toBe("MANA");
  });
});
