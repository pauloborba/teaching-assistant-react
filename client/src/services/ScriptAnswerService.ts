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
  async createScriptAnswer(data: { scriptId: string; classId: string; studentId: string }): Promise<ScriptAnswer> {
    const res = await fetch(`${API_URL}/scriptanswers/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create ScriptAnswer (status ${res.status})`);
    }
    return res.json();
  },

  /** Start answering a specific task (creates TaskAnswer with timer) */
  async startTask(scriptAnswerId: string, taskId: string): Promise<{ taskId: string; started_at: number }> {
    const res = await fetch(`${API_URL}/scriptanswers/${scriptAnswerId}/tasks/${taskId}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || "Failed to start task");
    }
    return res.json();
  },

  /** Submit answer for a specific task */
  async submitTask(
    scriptAnswerId: string,
    taskId: string,
    answer: string
  ): Promise<{ taskId: string; submitted_at: number; time_taken_seconds: number }> {
    const res = await fetch(`${API_URL}/scriptanswers/${scriptAnswerId}/tasks/${taskId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer })
    });

    if (!res.ok) throw new Error("Failed to submit task");
    return res.json();
  },

  /** Check and apply timeout to script answer */
  async checkTimeout(scriptAnswerId: string, timeoutSeconds: number = 3600): Promise<ScriptAnswer> {
    const res = await fetch(`${API_URL}/scriptanswers/${scriptAnswerId}/timeout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timeoutSeconds })
    });

    if (!res.ok) throw new Error("Failed to check timeout");
    return res.json();
  },

  /** Get ScriptAnswers by class and student (enrollment) */
  async getScriptAnswersByEnrollment(classId: string, studentId: string): Promise<ScriptAnswer[]> {
    const res = await fetch(`${API_URL}/scriptanswers/enrollment?classId=${classId}&studentId=${studentId}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch scriptAnswers by enrollment (status ${res.status})`);
    }
    return res.json();
  },

  /** Get ScriptAnswers by class */
  async getScriptAnswersByClassId(classId: string): Promise<ScriptAnswer[]> {
    const res = await fetch(`${API_URL}/scriptanswers/class/${classId}`);
    if (!res.ok) throw new Error("Failed to fetch scriptAnswers by class");
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
