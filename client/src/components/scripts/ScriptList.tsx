// src/components/Scripts/ScriptList.tsx
import React from 'react';
import { Script } from '../../types/Script';

interface ScriptListProps {
  scripts: Script[];
  onEdit: (script: Script) => void;
}

export default function ScriptList({ scripts, onEdit }: ScriptListProps) {
  if (scripts.length === 0) {
    return <p>No scripts yet.</p>;
  }

  return (
    <div>
      <h3>Existing Scripts</h3>
      <ul>
        {scripts.map((s) => (
          <li key={s.id}>
            <strong>{s.title || "(untitled)"}</strong>
            <button onClick={() => onEdit(s)} style={{ marginLeft: "1rem" }}>
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
