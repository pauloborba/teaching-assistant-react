import React, { useState } from 'react';
import { Script, CreateScriptRequest, UpdateScriptRequest } from '../../types/Script';
import TaskListEditor from './TaskListEditor'; // NEW COMPONENT
import { Task } from '../../types/Task';

interface ScriptEditorProps {
  script: Script | null;
  onSave: (data: CreateScriptRequest | UpdateScriptRequest) => void;
  onCancel?: () => void;
}

export default function ScriptEditor({ script, onSave, onCancel }: ScriptEditorProps) {
  const [title, setTitle] = useState(script?.title || "");
  const [tasks, setTasks] = useState<Task[]>(script?.tasks || []);

  const handleSubmit = () => {
    onSave({ title, tasks });
  };

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h3>{script ? "Edit Script" : "Create Script"}</h3>

      {/* Script title input */}
      <div>
        <label>Title:</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{ marginLeft: "1rem" }}
        />
      </div>

      <TaskListEditor tasks={tasks} setTasks={setTasks} />

      <button onClick={handleSubmit}>Save</button>
      {onCancel && (
        <button onClick={onCancel} style={{ marginLeft: "1rem" }}>
          Cancel
        </button>
      )}
    </div>
  );
}
