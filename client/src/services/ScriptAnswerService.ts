// ScriptAnswerService.ts

import {
  ScriptAnswer,
  UpdateSriptAnswerGradeRequest,
  updateTaskAnswerGradeRequest
} from "../types/ScriptAnswer";
import { Grade } from "../types/EspecificacaoDoCalculoDaMedia";

const API_URL = "http://localhost:3005/api";

export const ScriptAnswerService = {
  /** Fetch ALL ScriptAnswers */
  async getAllScriptAnswers(): Promise<ScriptAnswer[]> {
    const res = await fetch(`${API_URL}/scriptanswers/`);
    if (!res.ok) throw new Error("Failed to fetch scriptAnswers");
    return res.json();
  },

  /** Fetch ScriptAnswers for a specific student */
  async getScriptAnswersByStudentId(studentId: string): Promise<ScriptAnswer[]> {
    const res = await fetch(`${API_URL}/scriptanswers/student/${studentId}`);
    if (!res.ok) throw new Error("Failed to fetch scriptAnswers by student");
    return res.json();
  },

  /** Fetch ScriptAnswers for a specific script */
  async getScriptAnswersByScriptId(scriptId: string): Promise<ScriptAnswer[]> {
    const res = await fetch(`${API_URL}/scriptanswers/script/${scriptId}`);
    if (!res.ok) throw new Error("Failed to fetch scriptAnswers by script");
    return res.json();
  },

  /** Fetch a single ScriptAnswer by ID */
  async getScriptAnswerById(scriptAnswerId: string): Promise<ScriptAnswer> {
    const res = await fetch(`${API_URL}/scriptanswers/${scriptAnswerId}`);
    if (!res.ok) throw new Error("Failed to fetch ScriptAnswer");
    return res.json();
  },

  /** Create a new ScriptAnswer */
  async createScriptAnswer(scriptAnswer: Omit<ScriptAnswer, 'id'>): Promise<ScriptAnswer> {
    const res = await fetch(`${API_URL}/scriptanswers/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scriptAnswer)
    });

    if (!res.ok) throw new Error("Failed to create ScriptAnswer");
    return res.json();
  },

  /** Update the grade of a TaskAnswer inside a ScriptAnswer */
  async updateTaskAnswerGrade(
    scriptAnswerId: string,
    taskId: string,
    grade: Grade
  ): Promise<{ taskId: string; grade: Grade }> {
    const res = await fetch(
      `${API_URL}/scriptanswers/${scriptAnswerId}/tasks/${taskId}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grade })
      }
    );

    if (!res.ok) throw new Error("Failed to update task grade");
    return res.json();
  },

  /** Get the grade of a task inside a ScriptAnswer */
  async getTaskAnswerGrade(
    scriptAnswerId: string,
    taskId: string
  ): Promise<Grade | undefined> {
    const res = await fetch(
      `${API_URL}/scriptanswers/${scriptAnswerId}/tasks/${taskId}`
    );

    if (res.status === 404) return undefined;
    if (!res.ok) throw new Error("Failed to fetch task grade");

    const data = await res.json();
    return data.grade;
  },

  /** Add or update comment on a TaskAnswer inside a ScriptAnswer */
  async updateTaskAnswerComment(
    scriptAnswerId: string,
    taskId: string,
    comment: string
  ): Promise<{ taskId: string; comment: string }> {
    const res = await fetch(
      `${API_URL}/scriptanswers/${scriptAnswerId}/tasks/${taskId}/comments`,
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
