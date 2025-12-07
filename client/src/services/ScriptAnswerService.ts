// ScriptAnswerService.ts

import {
  ScriptAnswer,
  UpdateSriptAnswerGradeRequest,
  updateTaskAnswerGradeRequest
} from "../types/ScriptAnswer";
import { Grade } from "../types/EspecificacaoDoCalculoDaMedia";

const API_URL = "http://localhost:3005/api";

// ----------------------------------------
// ScriptAnswerService – UPDATED TO MATCH NEW ROUTES
// ----------------------------------------

export const ScriptAnswerService = {
  /** Fetch ALL ScriptAnswers */
  async getAllScriptAnswers(): Promise<ScriptAnswer[]> {
    const res = await fetch(`${API_URL}/scripts/answers`);
    if (!res.ok) throw new Error("Failed to fetch scriptAnswers");
    return res.json();
  },

  /** Fetch ScriptAnswers for a specific student */
  async getScriptAnswersByStudentId(studentId: string): Promise<ScriptAnswer[]> {
    const res = await fetch(`${API_URL}/scripts/answers/${studentId}`);
    if (!res.ok) throw new Error("Failed to fetch scriptAnswers by student");
    return res.json();
  },

  /** Create (or save) a ScriptAnswer */
  async saveScriptAnswer(scriptAnswer: ScriptAnswer): Promise<ScriptAnswer> {
    const res = await fetch(`${API_URL}/scripts/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scriptAnswer)
    });

    if (!res.ok) throw new Error("Failed to save ScriptAnswer");
    return res.json();
  },

  /** Update only the GRADE of a ScriptAnswer */
  async updateScriptAnswerGrade(
    req: UpdateSriptAnswerGradeRequest
  ): Promise<ScriptAnswer> {
    const res = await fetch(
      `${API_URL}/scripts/answers/${req.scriptAnswerId}/grade`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade: req.grade })
      }
    );

    if (!res.ok) throw new Error("Failed to update ScriptAnswer grade");
    return res.json();
  },

  /** Update one TaskAnswer: grade and/or comments */
  async updateTaskAnswer(req: updateTaskAnswerGradeRequest): Promise<any> {
    const res = await fetch(`${API_URL}/taskAnswers/${req.TaskAnswerId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grade: req.grade,
        comments: req.comments
      })
    });

    if (!res.ok) throw new Error("Failed to update TaskAnswer");
    return res.json();
  },

  /** Get the grade of a task inside a ScriptAnswer */
  async getTaskAnswerGrade(
    scriptAnswerId: string,
    taskId: string
  ): Promise<Grade | undefined> {
    const res = await fetch(
      `${API_URL}/scripts/answers/${scriptAnswerId}/tasks/${taskId}`
    );

    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error("Failed to fetch task grade");

    const data = await res.json();
    return data.grade;
  },

  /** Add comment to a ScriptAnswer */
  async updateScriptAnswerComment(
    scriptAnswerId: string,
    comment: string
  ): Promise<any> {
    const res = await fetch(
      `${API_URL}/scripts/answers/${scriptAnswerId}/comments`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
      }
    );

    if (!res.ok) throw new Error("Failed to update comment");
    return res.json();
  },

  /** Add comment to a TaskAnswer inside a ScriptAnswer */
  async updateTaskAnswerComment(
    scriptAnswerId: string,
    taskId: string,
    comment: string
  ): Promise<any> {
    const res = await fetch(
      `${API_URL}/scripts/answers/${scriptAnswerId}/tasks/${taskId}/comments`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment })
      }
    );

    if (!res.ok) throw new Error("Failed to update task comment");
    return res.json();
  }
};
