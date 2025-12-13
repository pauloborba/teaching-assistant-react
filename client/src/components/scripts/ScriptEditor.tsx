import { useEffect, useState } from 'react';
import { CreateScriptRequest, Script, UpdateScriptRequest } from '../../types/Script';
import { Task } from '../../types/Task';
import TaskListEditor from './TaskListEditor'; // NEW COMPONENT

interface ScriptEditorProps {
  script: Script | null;
  onSave: (data: CreateScriptRequest | UpdateScriptRequest) => void;
  onCancel?: () => void;
}

export default function ScriptEditor({ script, onSave, onCancel }: ScriptEditorProps) {
  const [title, setTitle] = useState(script?.title || "");
  const [description, setDescription] = useState(script?.description || "");
  const [tasks, setTasks] = useState<Task[]>(script?.tasks || []);

  // Update state when script prop changes
  useEffect(() => {
    setTitle(script?.title || "");
    setDescription(script?.description || "");
    setTasks(script?.tasks || []);
  }, [script]);

  const handleSubmit = () => {
    if (title.trim() === "") {
      alert("Title cannot be empty");
      return;
    }
    if (description.trim() === "") {
      alert("Description cannot be empty");
      return;
    }
    if (tasks.length === 0) {
      alert("Script must have at least one task");
      return;
    }
    onSave({ title, description, tasks });
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

      <div style={{ marginTop: "0.5rem" }}>
        <label>Description:</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ marginLeft: "1rem", width: "60%" }}
        />
      </div>

      <TaskListEditor tasks={tasks} setTasks={setTasks} />

      <button onClick={handleSubmit} disabled={tasks.length === 0} style={{ backgroundColor: "#4CAF50", color: "white" }}>Save</button>
      {onCancel && (
        <button onClick={onCancel} style={{ marginLeft: "1rem", backgroundColor: "#9E9E9E", color: "white" }}>
          Cancel
        </button>
      )}
    </div>
  );
}
