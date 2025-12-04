// components/TaskAnswerEditor.tsx
import React, { useEffect, useState } from "react";
import { TaskAnswer } from "../../types/ScriptAnswer";
import { Grade } from "../../types/EspecificacaoDoCalculoDaMedia";
import TaskService from "../../services/TaskService";
import { Task } from "../../types/Task";

interface Props {
  taskAnswer: TaskAnswer;
  onChange: (updated: TaskAnswer) => void;
}

const gradeOptions: Grade[] = ["MA", "MANA", "MPA"];

export default function TaskAnswerEditor({ taskAnswer, onChange }: Props) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const update = (changes: Partial<TaskAnswer>) => {
    onChange({ ...taskAnswer, ...changes });
  };

  // 🔥 Load task details from backend
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const t = await TaskService.getTaskById(taskAnswer.taskId);
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
  }, [taskAnswer.taskId]);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: "12px",
        marginBottom: "12px",
        borderRadius: "6px",
      }}
    >
      {/* 🔥 Replace old line */}
      <strong>
        Task:{" "}
        {loading
          ? "Loading task..."
          : task
          ? task.statement // <–– SHOW THE TASK STATEMENT HERE
          : `Unknown task ${taskAnswer.taskId}`}
      </strong>


      {/* 🔽 User answer */}
      <div style={{ marginTop: 8 }}>
        <strong>Answer:</strong> {taskAnswer.answer}
      </div>

      {/* 🔽 Grade selector */}
      <div style={{ marginTop: 8 }}>
        Grade:
        <select
          value={taskAnswer.grade ?? ""}
          onChange={(e) => update({ grade: e.target.value as Grade })}
        >
          <option value="">—</option>
          {gradeOptions.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {/* 🔽 Comments */}
      <div style={{ marginTop: 8 }}>
        Comments:
        <textarea
          value={taskAnswer.comments ?? ""}
          onChange={(e) => update({ comments: e.target.value })}
          rows={3}
          style={{ width: "100%" }}
        />
      </div>
    </div>
  );
}
