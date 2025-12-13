import { Task } from "../models/Task";

describe("Task", () => {
  // ---------------------------------------------------------------
  test("constructor initializes fields correctly", () => {
    const task = new Task("t1", "Write an essay");

    expect(task.getId()).toBe("t1");
    expect(task.statement).toBe("Write an essay");
  });

  // ---------------------------------------------------------------
  test("getId() returns task id", () => {
    const task = new Task("t123", "Statement");

    expect(task.getId()).toBe("t123");
  });

  // ---------------------------------------------------------------
  test("toJSON() returns correct structure", () => {
    const task = new Task("t1", "Complete the assignment");

    const json = task.toJSON();

    expect(json).toEqual({
      id: "t1",
      statement: "Complete the assignment"
    });
  });

  // ---------------------------------------------------------------
  describe("update()", () => {
    test("updates statement", () => {
      const task = new Task("t1", "Old statement");

      task.update({ statement: "New statement" });

      expect(task.statement).toBe("New statement");
    });

    test("does not update when statement is undefined", () => {
      const task = new Task("t1", "Original");

      task.update({});

      expect(task.statement).toBe("Original");
    });

    test("updates with attachment parameter (ignored)", () => {
      const task = new Task("t1", "Statement");

      // attachment is in the signature but not implemented
      task.update({ attachment: "file.pdf" });

      expect(task.statement).toBe("Statement");
    });
  });

  // ---------------------------------------------------------------
  describe("fromJSON()", () => {
    test("creates Task instance from JSON", () => {
      const json = {
        id: "t1",
        statement: "Do something"
      };

      const task = Task.fromJSON(json);

      expect(task).toBeInstanceOf(Task);
      expect(task.getId()).toBe("t1");
      expect(task.statement).toBe("Do something");
    });

    test("creates Task from object with extra properties", () => {
      const json = {
        id: "t2",
        statement: "Task statement",
        extraProp: "ignored"
      };

      const task = Task.fromJSON(json);

      expect(task.getId()).toBe("t2");
      expect(task.statement).toBe("Task statement");
    });
  });
});
