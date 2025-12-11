import { Script } from "../models/Script";
import { Task } from "../models/Task";

describe("Script", () => {
  // ---------------------------------------------------------------
  test("constructor initializes fields correctly", () => {
    const script = new Script("s1", "Test Script", "A test description");

    expect(script.getId()).toBe("s1");
    expect(script.getTitle()).toBe("Test Script");
    expect(script.getDescription()).toBe("A test description");
    expect(script.tasks).toEqual([]);
  });

  test("constructor with tasks initializes correctly", () => {
    const task1 = new Task("t1", "Task 1");
    const task2 = new Task("t2", "Task 2");
    const script = new Script("s1", "Test", "Desc", [task1, task2]);

    expect(script.tasks.length).toBe(2);
    expect(script.tasks[0]).toBe(task1);
    expect(script.tasks[1]).toBe(task2);
  });

  test("constructor without title and description works", () => {
    const script = new Script("s1");

    expect(script.getId()).toBe("s1");
    expect(script.getTitle()).toBeUndefined();
    expect(script.getDescription()).toBeUndefined();
  });

  // ---------------------------------------------------------------
  test("toJSON() returns correct structure", () => {
    const task1 = new Task("t1", "Task 1");
    const script = new Script("s1", "My Script", "Description");
    script.addTask(task1);

    const json = script.toJSON();

    expect(json).toEqual({
      id: "s1",
      title: "My Script",
      description: "Description",
      tasks: [
        {
          id: "t1",
          statement: "Task 1"
        }
      ]
    });
  });

  test("toJSON() filters out invalid tasks", () => {
    const script = new Script("s1", "Test");
    const task1 = new Task("t1", "Valid task");
    script.addTask(task1);
    
    // Simulate invalid task
    (script.tasks as any).push(null);
    
    const json = script.toJSON();
    expect(json.tasks.length).toBe(1);
  });

  // ---------------------------------------------------------------
  describe("addTask()", () => {
    test("adds new task successfully", () => {
      const script = new Script("s1");
      const task = new Task("t1", "Task 1");

      const result = script.addTask(task);

      expect(result).toBe(task);
      expect(script.tasks.length).toBe(1);
      expect(script.tasks[0]).toBe(task);
    });

    test("throws error when adding duplicate task", () => {
      const script = new Script("s1");
      const task = new Task("t1", "Task 1");

      script.addTask(task);

      expect(() => {
        script.addTask(task);
      }).toThrow("Task already in script");
    });

    test("throws error when adding task with duplicate ID", () => {
      const script = new Script("s1");
      const task1 = new Task("t1", "Task 1");
      const task2 = new Task("t1", "Task 2");

      script.addTask(task1);

      expect(() => {
        script.addTask(task2);
      }).toThrow("Task already in script");
    });
  });

  // ---------------------------------------------------------------
  describe("findTaskById()", () => {
    test("finds existing task", () => {
      const script = new Script("s1");
      const task1 = new Task("t1", "Task 1");
      const task2 = new Task("t2", "Task 2");

      script.addTask(task1);
      script.addTask(task2);

      const found = script.findTaskById("t1");
      expect(found).toBe(task1);
    });

    test("returns undefined for non-existent task", () => {
      const script = new Script("s1");
      const task1 = new Task("t1", "Task 1");

      script.addTask(task1);

      const found = script.findTaskById("t999");
      expect(found).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  describe("removeTask()", () => {
    test("removes existing task and returns true", () => {
      const script = new Script("s1");
      const task1 = new Task("t1", "Task 1");
      const task2 = new Task("t2", "Task 2");

      script.addTask(task1);
      script.addTask(task2);

      const result = script.removeTask("t1");

      expect(result).toBe(true);
      expect(script.tasks.length).toBe(1);
      expect(script.tasks[0]).toBe(task2);
    });

    test("returns false when task does not exist", () => {
      const script = new Script("s1");
      const task1 = new Task("t1", "Task 1");

      script.addTask(task1);

      const result = script.removeTask("t999");

      expect(result).toBe(false);
      expect(script.tasks.length).toBe(1);
    });

    test("works with empty task list", () => {
      const script = new Script("s1");

      const result = script.removeTask("t1");

      expect(result).toBe(false);
    });
  });

  // ---------------------------------------------------------------
  describe("update()", () => {
    test("updates title", () => {
      const script = new Script("s1", "Old Title");

      script.update({ title: "New Title" });

      expect(script.getTitle()).toBe("New Title");
    });

    test("updates description", () => {
      const script = new Script("s1", "Title", "Old Desc");

      script.update({ description: "New Description" });

      expect(script.getDescription()).toBe("New Description");
    });

    test("updates tasks from JSON", () => {
      const script = new Script("s1");
      const task1 = new Task("t1", "Old Task");
      script.addTask(task1);

      script.update({
        tasks: [
          { id: "t2", statement: "New Task 1" },
          { id: "t3", statement: "New Task 2" }
        ]
      });

      expect(script.tasks.length).toBe(2);
      expect(script.tasks[0].getId()).toBe("t2");
      expect(script.tasks[0].statement).toBe("New Task 1");
      expect(script.tasks[1].getId()).toBe("t3");
      expect(script.tasks[1].statement).toBe("New Task 2");
    });

    test("updates multiple fields at once", () => {
      const script = new Script("s1", "Old", "Old Desc");

      script.update({
        title: "New Title",
        description: "New Description",
        tasks: [{ id: "t1", statement: "Task 1" }]
      });

      expect(script.getTitle()).toBe("New Title");
      expect(script.getDescription()).toBe("New Description");
      expect(script.tasks.length).toBe(1);
    });

    test("does not update fields when undefined", () => {
      const script = new Script("s1", "Title", "Desc");

      script.update({});

      expect(script.getTitle()).toBe("Title");
      expect(script.getDescription()).toBe("Desc");
    });
  });
});
