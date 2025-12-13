// src/components/Scripts/ScriptsPage.tsx
import React, { useState } from 'react';
import { Script } from '../../types/Script';
import { useScripts } from './UseScripts';
import ScriptList from './ScriptList';
import ScriptEditor from './ScriptEditor';

interface ScriptsPageProps {
  onError: (message: string) => void;
}

export default function ScriptsPage({ onError }: ScriptsPageProps) {
  const {
    scripts,
    loading,
    createScript,
    updateScript,
    reloadScripts,
  } = useScripts(onError);

  const [editingScript, setEditingScript] = useState<Script | null>(null);

  const handleEdit = (script: Script) => {
    setEditingScript(script);
  };

  const handleCancelEdit = () => {
    setEditingScript(null);
  };

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Scripts</h2>

      <ScriptEditor
        script={editingScript}
        onSave={(data) => {
          if (editingScript) {
            updateScript(editingScript.id, data);
          } else {
            createScript(data);
          }
          setEditingScript(null);
        }}
        onCancel={editingScript ? handleCancelEdit : undefined}
      />

      <hr />

      {loading && <p>Loading scripts...</p>}

      <ScriptList scripts={scripts} onEdit={handleEdit} />
    </div>
  );
}
