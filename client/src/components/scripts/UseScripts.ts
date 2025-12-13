// src/components/Scripts/useScripts.ts
import { useEffect, useState } from 'react';
import ScriptService from '../../services/ScriptService';
import {
  Script,
  CreateScriptRequest,
  UpdateScriptRequest,
} from '../../types/Script';

export function useScripts(onError: (msg: string) => void) {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const reloadScripts = async () => {
    setLoading(true);
    try {
      const data = await ScriptService.getAllScripts();
      setScripts(data);
    } catch (err) {
      onError("Failed to load scripts.");
    } finally {
      setLoading(false);
    }
  };

  const createScript = async (req: CreateScriptRequest) => {
    try {
      const created = await ScriptService.createScript(req);
      setScripts(prev => [...prev, created]);
    } catch {
      onError("Failed to create script.");
    }
  };

  const updateScript = async (id: string, req: UpdateScriptRequest) => {
    try {
      const updated = await ScriptService.updateScript(id, req);
      setScripts(prev =>
        prev.map(s => (s.id === id ? updated : s))
      );
    } catch {
      onError("Failed to update script.");
    }
  };

  useEffect(() => {
    reloadScripts();
  }, []);

  return {
    scripts,
    loading,
    reloadScripts,
    createScript,
    updateScript,
  };
}
