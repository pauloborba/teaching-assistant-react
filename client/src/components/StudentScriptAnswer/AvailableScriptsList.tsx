// AvailableScriptsList.tsx
import React from 'react';
import { Script } from '../../types/Script';

interface Props {
  scripts: Script[];
  onStartScript: (scriptId: string) => void;
}

export default function AvailableScriptsList({ scripts, onStartScript }: Props) {
  return (
    <div style={{ padding: '2rem' }}>
      <h2>Available Scripts</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Select a script to begin answering
      </p>

      {scripts.length === 0 ? (
        <div style={{
          padding: '2rem',
          textAlign: 'center',
          background: '#f5f5f5',
          borderRadius: '8px',
          color: '#666'
        }}>
          No scripts available at the moment
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))'
        }}>
          {scripts.map(script => (
            <div
              key={script.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1.5rem',
                background: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                {script.title || script.id}
              </h3>
              
              <div style={{ marginBottom: '1rem', color: '#666', fontSize: '0.9rem' }}>
                {script.tasks && script.tasks.length > 0 ? (
                  <span>{script.tasks.length} task{script.tasks.length !== 1 ? 's' : ''}</span>
                ) : (
                  <span>No tasks</span>
                )}
              </div>

              <button
                onClick={() => onStartScript(script.id)}
                disabled={!script.tasks || script.tasks.length === 0}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: script.tasks && script.tasks.length > 0 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: script.tasks && script.tasks.length > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '1rem',
                  fontWeight: '500',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (script.tasks && script.tasks.length > 0) {
                    e.currentTarget.style.opacity = '0.9';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Start Script
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
