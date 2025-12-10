import { Script } from "../models/Script";
import { Scripts } from "../models/Scripts";
import { Task } from "../models/Task";

describe("Scripts", () => {
  let scripts: Scripts;

  beforeEach(() => {
    scripts = new Scripts();
  });

  // ---------------------------------------------------------------
  describe("addScript()", () => {
    test("adds new script successfully", () => {
      const data = {
        title: "Test Script",
        description: "A test description",
        tasks: [
          { id: "t1", statement: "Task 1" },
          { id: "t2", statement: "Task 2" }
        ]
      };

      const script = scripts.addScript(data);

      expect(script).toBeInstanceOf(Script);
      expect(script.getTitle()).toBe("Test Script");
      expect(script.getDescription()).toBe("A test description");
      expect(script.tasks.length).toBe(2);
      expect(script.getId()).toBeDefined();
    });

    test("generates ID when not provided", () => {
      const data = {
        title: "Script",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      const script = scripts.addScript(data);

      expect(script.getId()).toBeDefined();
      expect(script.getId().length).toBeGreaterThan(0);
    });

    test("uses provided ID when given", () => {
      const data = {
        id: "custom-id",
        title: "Script",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      const script = scripts.addScript(data);

      expect(script.getId()).toBe("custom-id");
    });

    test("throws error when title is missing", () => {
      const data = {
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      expect(() => {
        scripts.addScript(data);
      }).toThrow("Script title is required");
    });

    test("throws error when title is empty string", () => {
      const data = {
        title: "   ",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      expect(() => {
        scripts.addScript(data);
      }).toThrow("Script title is required");
    });

    test("throws error when description is missing", () => {
      const data = {
        title: "Title",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      expect(() => {
        scripts.addScript(data);
      }).toThrow("Script description is required");
    });

    test("throws error when description is empty string", () => {
      const data = {
        title: "Title",
        description: "  ",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      expect(() => {
        scripts.addScript(data);
      }).toThrow("Script description is required");
    });

    test("throws error when tasks array is missing", () => {
      const data = {
        title: "Title",
        description: "Description"
      };

      expect(() => {
        scripts.addScript(data);
      }).toThrow("Script must have at least one task");
    });

    test("throws error when tasks array is empty", () => {
      const data = {
        title: "Title",
        description: "Description",
        tasks: []
      };

      expect(() => {
        scripts.addScript(data);
      }).toThrow("Script must have at least one task");
    });

    test("throws error when script with same title already exists", () => {
      const data1 = {
        title: "Duplicate Title",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      const data2 = {
        title: "Duplicate Title",
        description: "Different Description",
        tasks: [{ id: "t2", statement: "Task 2" }]
      };

      scripts.addScript(data1);

      expect(() => {
        scripts.addScript(data2);
      }).toThrow("Script with this title already exists");
    });

    test("converts tasks from JSON to Task instances", () => {
      const data = {
        title: "Script",
        description: "Description",
        tasks: [
          { id: "t1", statement: "Task 1" },
          { id: "t2", statement: "Task 2" }
        ]
      };

      const script = scripts.addScript(data);

      expect(script.tasks[0]).toBeInstanceOf(Task);
      expect(script.tasks[1]).toBeInstanceOf(Task);
      expect(script.tasks[0].getId()).toBe("t1");
      expect(script.tasks[1].statement).toBe("Task 2");
    });
  });

  // ---------------------------------------------------------------
  describe("getAllScripts()", () => {
    test("returns empty array when no scripts", () => {
      const result = scripts.getAllScripts();

      expect(result).toEqual([]);
    });

    test("returns all added scripts", () => {
      const data1 = {
        title: "Script 1",
        description: "Desc 1",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      const data2 = {
        title: "Script 2",
        description: "Desc 2",
        tasks: [{ id: "t2", statement: "Task" }]
      };

      scripts.addScript(data1);
      scripts.addScript(data2);

      const result = scripts.getAllScripts();

      expect(result.length).toBe(2);
      expect(result[0].getTitle()).toBe("Script 1");
      expect(result[1].getTitle()).toBe("Script 2");
    });
  });

  // ---------------------------------------------------------------
  describe("findById()", () => {
    test("finds existing script by ID", () => {
      const data = {
        id: "s123",
        title: "Script",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      scripts.addScript(data);

      const found = scripts.findById("s123");

      expect(found).toBeInstanceOf(Script);
      expect(found?.getId()).toBe("s123");
    });

    test("returns undefined for non-existent ID", () => {
      const data = {
        title: "Script",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      scripts.addScript(data);

      const found = scripts.findById("non-existent");

      expect(found).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  describe("findByName()", () => {
    test("finds existing script by title", () => {
      const data = {
        title: "Unique Script",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      scripts.addScript(data);

      const found = scripts.findByName("Unique Script");

      expect(found).toBeInstanceOf(Script);
      expect(found?.getTitle()).toBe("Unique Script");
    });

    test("returns undefined for non-existent title", () => {
      const data = {
        title: "Script",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      scripts.addScript(data);

      const found = scripts.findByName("Non-existent Script");

      expect(found).toBeUndefined();
    });

    test("is case-sensitive", () => {
      const data = {
        title: "Script",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      scripts.addScript(data);

      const found = scripts.findByName("script");

      expect(found).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  describe("updateScript()", () => {
    test("updates existing script and returns it", () => {
      const data = {
        id: "s1",
        title: "Original Title",
        description: "Original Description",
        tasks: [{ id: "t1", statement: "Task 1" }]
      };

      scripts.addScript(data);

      const updated = scripts.updateScript("s1", {
        title: "Updated Title",
        description: "Updated Description"
      });

      expect(updated).toBeInstanceOf(Script);
      expect(updated?.getTitle()).toBe("Updated Title");
      expect(updated?.getDescription()).toBe("Updated Description");
    });

    test("updates tasks", () => {
      const data = {
        id: "s1",
        title: "Script",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task 1" }]
      };

      scripts.addScript(data);

      const updated = scripts.updateScript("s1", {
        tasks: [
          { id: "t2", statement: "New Task 1" },
          { id: "t3", statement: "New Task 2" }
        ]
      });

      expect(updated?.tasks.length).toBe(2);
      expect(updated?.tasks[0].getId()).toBe("t2");
      expect(updated?.tasks[1].statement).toBe("New Task 2");
    });

    test("returns undefined for non-existent ID", () => {
      const updated = scripts.updateScript("non-existent", {
        title: "New Title"
      });

      expect(updated).toBeUndefined();
    });

    test("partially updates script", () => {
      const data = {
        id: "s1",
        title: "Original",
        description: "Description",
        tasks: [{ id: "t1", statement: "Task" }]
      };

      scripts.addScript(data);

      const updated = scripts.updateScript("s1", {
        title: "Updated"
      });

      expect(updated?.getTitle()).toBe("Updated");
      expect(updated?.getDescription()).toBe("Description");
      expect(updated?.tasks.length).toBe(1);
    });
  });
});
