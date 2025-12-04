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

  const handleUpdateTask = (updated: TaskAnswer) => {
    ScriptAnswerService.updateTaskAnswer({
      TaskAnswerId: updated.id,
      grade: updated.grade,
      comments: updated.comments
    });

    // Reload updated script answer
    const refreshed = ScriptAnswerService
      .getAllScriptAnswers()
      .find(sa => sa.id === current.id);

    if (refreshed) setCurrent(refreshed);
  };

  return (
    <div>
      <button onClick={onClose}>← Back</button>
      <h2>Grading Script {current.scriptId}</h2>
      <h3>Student {current.studentId}</h3>

      {current.taskAnswers.map(task => (
        <TaskAnswerEditor
          key={task.id}
          taskAnswer={task}
          onChange={handleUpdateTask}
        />
      ))}
    </div>
  );
}
