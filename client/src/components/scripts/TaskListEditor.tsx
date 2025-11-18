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
      <div>
        <input
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          placeholder="New task..."
        />
        <button onClick={addTask} style={{ marginLeft: "1rem" }}>
          Add
        </button>
      </div>

      {/* Display and edit tasks */}
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {editingTaskId === task.id ? (
              <>
                <input
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                />
                <button onClick={saveEdit} style={{ marginLeft: "0.5rem" }}>Save</button>
                <button onClick={() => setEditingTaskId(null)} style={{ marginLeft: "0.5rem" }}>Cancel</button>
              </>
            ) : (
              <>
                {task.statement}
                <button onClick={() => startEdit(task)} style={{ marginLeft: "0.5rem" }}>Edit</button>
                <button onClick={() => deleteTask(task.id)} style={{ marginLeft: "0.5rem", color: "red" }}>Delete</button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
