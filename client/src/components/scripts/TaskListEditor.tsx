import React, { useState } from 'react';
import { Task } from '../../types/Task';

interface Props {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

export default function TaskListEditor({ tasks, setTasks }: Props) {
  const [taskText, setTaskText] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const addTask = () => {
    if (!taskText.trim()) return;
    setTasks([...tasks, { id: crypto.randomUUID(), statement: taskText.trim() }]);
    setTaskText("");
  };

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingText(task.statement || "");
  };

  const saveEdit = () => {
    setTasks(tasks.map(t => t.id === editingTaskId ? { ...t, statement: editingText } : t));
    setEditingTaskId(null);
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      <h4>Tasks</h4>

      {/* Add new task */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="New task..."
          style={{ marginRight: "1rem" }}
        />
        <button onClick={addTask}>
          Add
        </button>
      </div>

      {/* Display and edit tasks */}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {tasks.map((task) => (
          <li key={task.id} style={{ marginBottom: "1rem", padding: "0.5rem", backgroundColor: "#f5f5f5", borderRadius: "4px" }}>
            {editingTaskId === task.id ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button onClick={saveEdit}>Save</button>
                <button onClick={() => setEditingTaskId(null)}>Cancel</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ flex: 1 }}>{task.statement}</span>
                <button onClick={() => startEdit(task)} style={{ backgroundColor: "#4CAF50", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer" }}>Edit</button>
                <button onClick={() => deleteTask(task.id)} style={{ backgroundColor: "#f44336", color: "white", border: "none", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer" }}>Delete</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
