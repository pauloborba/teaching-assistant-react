// ScriptAnswerService.ts
import {
  ScriptAnswer,
  TaskAnswer,
  UpdateSriptAnswerGradeRequest,
  updateTaskAnswerGradeRequest
} from "../types/ScriptAnswer"; // adjust path
import { Grade } from "../types/EspecificacaoDoCalculoDaMedia";

const STORAGE_KEY = "scriptAnswers";

// ----------------------------------------
// Utilities
// ----------------------------------------

function load(): ScriptAnswer[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}


function save(data: ScriptAnswer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}



// ----------------------------------------
// Mock Data Initialization
// ----------------------------------------

function initializeMockData() {
  const existing = load();
  if (existing.length > 0) return; // already initialized

  const starter: ScriptAnswer[] = [
    {
      id: "SA1",
      scriptId: "Script-01",
      studentId: "Student-001",
      grade: undefined,
      taskAnswers: [
        {
          id: "TA1-1",
          taskId: "Task-1",
          answer: "Answer to Task 1",
          grade: undefined,
          comments: ""
        },
        {
          id: "TA1-2",
          taskId: "Task-2",
          answer: "Answer to Task 2",
          grade: undefined,
          comments: ""
        }
      ]
    },
    {
      id: "SA2",
      scriptId: "Script-01",
      studentId: "Student-002",
      grade: "MA",
      taskAnswers: [
        {
          id: "TA2-1",
          taskId: "Task-1",
          answer: "Answer to Task 1",
          grade: "MA",
          comments: "Good work!"
        },
        {
          id: "TA2-2",
          taskId: "Task-2",
          answer: "Answer to Task 2",
          grade: "MANA",
          comments: ""
        }
      ]
    },
    {
      id: "SA3",
      scriptId: "Script-02",
      studentId: "Student-003",
      grade: undefined,
      taskAnswers: [
        {
          id: "TA3-1",
          taskId: "Task-1",
          answer: "Answer to Task 1",
          grade: "MPA",
          comments: "Needs improvement"
        }
      ]
    }
  ];

  save(starter);
  console.log("[ScriptAnswerService] Mock data initialized.");
}

// Run initialization at import time
initializeMockData();

// ----------------------------------------
// ScriptAnswerService
// ----------------------------------------

export const ScriptAnswerService = {
  /** Returns ALL ScriptAnswers */
  getAllScriptAnswers(): ScriptAnswer[] {
    return load();
  },

  /** Returns all ScriptAnswers by student ID */
  getScriptAnswersByStudentId(studentId: string): ScriptAnswer[] {
    return load().filter(sa => sa.studentId === studentId);
  },

  /** Add or replace a ScriptAnswer (for testing/mock writing) */
  saveScriptAnswer(scriptAnswer: ScriptAnswer): void {
    const list = load();
    const index = list.findIndex(sa => sa.id === scriptAnswer.id);

    if (index >= 0) list[index] = scriptAnswer;
    else list.push(scriptAnswer);

    save(list);
  },

  /** Update only the ScriptAnswer grade */
  updateScriptAnswerGrade(req: UpdateSriptAnswerGradeRequest): void {
    const list = load();
    const sa = list.find(s => s.id === req.scriptAnswerId);
    if (!sa) return;

    sa.grade = req.grade;
    save(list);
  },

  /** Update a single TaskAnswer inside a ScriptAnswer */
  updateTaskAnswer(req: updateTaskAnswerGradeRequest): void {
    const list = load();

    for (const sa of list) {
      const task = sa.taskAnswers.find(t => t.id === req.TaskAnswerId);
      if (task) {
        if (req.grade !== undefined) task.grade = req.grade;
        if (req.comments !== undefined) task.comments = req.comments;
        break;
      }
    }

    save(list);
  }

  /* Get task by taskanswerid */
};
