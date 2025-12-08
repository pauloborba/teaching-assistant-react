// pages/ScriptGrading.tsx
import React, { useState } from "react";
import { ScriptAnswer, TaskAnswer } from "../../types/ScriptAnswer";
import { ScriptAnswerService } from "../../services/ScriptAnswerService";
import TaskAnswerEditor from "./TaskAnswerEditor";

interface Props {
  scriptAnswer: ScriptAnswer;
  onClose: () => void;
}

export default function ScriptGrading({ scriptAnswer, onClose }: Props) {
  const [current, setCurrent] = useState<ScriptAnswer>(scriptAnswer);
  const [loading, setLoading] = useState(false);

  const handleUpdateTask = async (updated: TaskAnswer) => {
    try {
      setLoading(true);

      // Update grade if changed
      if (updated.grade) {
        await ScriptAnswerService.updateTaskAnswerGrade(
          current.id,
          updated.task,
          updated.grade
        );
      }

      // Update comments if present
      if (updated.comments) {
        await ScriptAnswerService.updateTaskAnswerComment(
          current.id,
          updated.task,
          updated.comments
        );
      }

      // Reload updated script answer
      const refreshed = await ScriptAnswerService.getScriptAnswerById(current.id);
      if (refreshed) {
        setCurrent(refreshed);
      }
    } catch (error) {
      console.error("Failed to update task answer:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={onClose} disabled={loading}>
        ← Back
      </button>
      <h2>Grading Script {current.scriptId}</h2>
      <h3>Student {current.student}</h3>

      {current.answers.map(task => (
        <TaskAnswerEditor
          key={task.id}
          taskAnswer={task}
          onChange={handleUpdateTask}
        />
      ))}
    </div>
  );
}
