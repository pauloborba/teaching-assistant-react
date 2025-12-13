// components/TaskAnswerEditor.tsx
import React, { useEffect, useState } from "react";
import { TaskAnswer } from "../../types/ScriptAnswer";
import { Grade } from "../../types/EspecificacaoDoCalculoDaMedia";
import TaskService from "../../services/TaskService";
import { Task } from "../../types/Task";

interface Props {
  taskAnswer: TaskAnswer;
  onChange: (updated: TaskAnswer) => void;
  disabled?: boolean;
}

const gradeOptions: Grade[] = ["MA", "MANA", "MPA"];

export default function TaskAnswerEditor({ taskAnswer, onChange, disabled = false }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [localGrade, setLocalGrade] = useState<Grade | undefined>(taskAnswer.grade);
  const [localComments, setLocalComments] = useState(taskAnswer.comments ?? "");
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleGradeChange = (grade: Grade | undefined) => {
    setLocalGrade(grade);
    setHasChanges(true);
  };

  const handleCommentsChange = (comments: string) => {
    setLocalComments(comments);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated: TaskAnswer = {
        ...taskAnswer,
        grade: localGrade,
        comments: localComments
      };
      onChange(updated);
      setHasChanges(false);
    } catch (err) {
      console.error("Failed to save changes:", err);
    } finally {
      setSaving(false);
    }
  };

  // 🔥 Load task details from backend
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const t = await TaskService.getTaskById(taskAnswer.task);
        if (!cancelled) setTask(t);
      } catch (err) {
        console.error("Failed to load task:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [taskAnswer.task]);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: "12px",
        marginBottom: "12px",
        borderRadius: "6px",
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? "none" : "auto"
      }} 
    >
      {/* Task statement */}
      <strong data-testid={`task-answer-${taskAnswer.id}`}>
        Task:{" "}
        {loading
          ? "Loading task..."
          : task
          ? task.statement
          : `Unknown task ${taskAnswer.task}`}
      </strong>

      {/* User answer */}
      <div style={{ marginTop: 8 }}>
        <strong>Answer:</strong> {taskAnswer.answer}
      </div>

      {/* Grade selector */}
      <div style={{ marginTop: 8 }}>
        <label>
          Grade:
          <select
            value={localGrade ?? ""}
            onChange={(e) => handleGradeChange(e.target.value as Grade | undefined)}
            disabled={saving}
            data-testid={`task-grade-input-${taskAnswer.id}`}
          >
            <option value="">—</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Comments */}
      <div style={{ marginTop: 8 }}>
        <label>
          Comments:
          <textarea
            value={localComments}
            onChange={(e) => handleCommentsChange(e.target.value)}
            rows={3}
            disabled={saving}
            style={{ width: "100%" }}
            data-testid={`task-comment-input-${taskAnswer.id}`}
          />
        </label>
      </div>

      {/* Save button */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={handleSave}
          disabled={!hasChanges || saving || disabled}
          style={{
            padding: "8px 16px",
            backgroundColor: hasChanges ? "#007bff" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: hasChanges && !saving ? "pointer" : "not-allowed",
            opacity: hasChanges && !saving ? 1 : 0.6
          }}
          data-testid={`task-save-button-${taskAnswer.id}`}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
