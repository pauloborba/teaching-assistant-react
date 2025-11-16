import React, { useState } from 'react';
import ScriptService from '../services/ScriptService';
import { CreateScriptRequest, Script, UpdateScriptRequest, isValidJSON } from '../types/Script';

interface Props {
  onError: (msg: string) => void;
}

const Scripts: React.FC<Props> = ({ onError }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Create form
  const [createTitle, setCreateTitle] = useState('');
  const [createContentText, setCreateContentText] = useState('');

  // Load/update
  const [scriptIdToLoad, setScriptIdToLoad] = useState('');
  const [loadedScript, setLoadedScript] = useState<Script | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContentText, setEditContentText] = useState('');

  const clearMessages = () => {
    setMessage('');
    onError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    let content: any = createContentText;
    if (createContentText && isValidJSON(createContentText)) {
      try { content = JSON.parse(createContentText); } catch { content = createContentText; }
    }

    setLoading(true);
    try {
      const req: CreateScriptRequest = { title: createTitle || undefined, content };
      const res = await ScriptService.createScript(req);
      setMessage(`Created script with id ${res.id}`);
      setCreateTitle('');
      setCreateContentText('');
      setLoadedScript(res);
      setEditTitle(res.title || '');
      setEditContentText(JSON.stringify(res.content, null, 2));
    } catch (err) {
      const msg = (err as Error).message || 'Error creating script';
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = async () => {
    clearMessages();
    if (!scriptIdToLoad.trim()) return onError('Enter script id to load');
    setLoading(true);
    try {
      const res = await ScriptService.getScriptById(scriptIdToLoad.trim());
      setLoadedScript(res);
      setEditTitle(res.title || '');
      setEditContentText(JSON.stringify(res.content, null, 2));
      setMessage('Script loaded');
    } catch (err) {
      const msg = (err as Error).message || 'Error loading script';
      onError(msg);
      setLoadedScript(null);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    clearMessages();
    if (!loadedScript) return onError('No script loaded to update');

    let content: any = editContentText;
    if (editContentText && isValidJSON(editContentText)) {
      try { content = JSON.parse(editContentText); } catch { content = editContentText; }
    }

    setLoading(true);
    try {
      const req: UpdateScriptRequest = { title: editTitle || undefined, content };
      const res = await ScriptService.updateScript(loadedScript.id, req);
      setLoadedScript(res);
      setEditTitle(res.title || '');
      setEditContentText(JSON.stringify(res.content, null, 2));
      setMessage('Script updated');
    } catch (err) {
      onError((err as Error).message || 'Error updating script');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scripts-container">
      <h3>Scripts</h3>

      <div className="student-form">
        <h4 style={{ marginBottom: '1rem' }}>Create New Script</h4>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label>Title</label>
            <input value={createTitle} onChange={e => setCreateTitle(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Content (JSON or text)</label>
            <textarea rows={6} value={createContentText} onChange={e => setCreateContentText(e.target.value)} />
          </div>

          <div className="form-buttons">
            <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Script'}</button>
          </div>
        </form>
      </div>

      <hr style={{ margin: '1.5rem 0' }} />

      <div className="student-form">
        <h4 style={{ marginBottom: '1rem' }}>Load / Edit Script</h4>

        <div className="form-row" style={{ alignItems: 'center' }}>
          <div style={{ flex: 1 }} className="form-group">
            <label>Script ID</label>
            <input placeholder="Script ID" value={scriptIdToLoad} onChange={e => setScriptIdToLoad(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
            <button type="button" onClick={handleLoad} disabled={loading}>{loading ? 'Loading...' : 'Load'}</button>
          </div>
        </div>

        {loadedScript && (
          <div style={{ marginTop: '12px' }}>
            <div className="form-group">
              <label>Title</label>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Content (JSON or text)</label>
              <textarea rows={8} value={editContentText} onChange={e => setEditContentText(e.target.value)} />
            </div>

            <div className="form-buttons">
              <button type="button" onClick={handleUpdate} disabled={loading}>{loading ? 'Saving...' : 'Update Script'}</button>
              <div style={{ alignSelf: 'center', marginLeft: '8px', color: '#4a5568' }}>Loaded id: <strong>{loadedScript.id}</strong></div>
            </div>
          </div>
        )}
      </div>

      {message && <div className="info-message" style={{ marginTop: '1rem' }}>{message}</div>}
    </div>
  );
};

export default Scripts;
