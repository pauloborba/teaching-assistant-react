import React, { useEffect, useState } from 'react';
import { Goal } from '../types/Goal';
import GoalService from '../services/GoalService';

interface Props {
  classId: string;
}

const GoalsManagement: React.FC<Props> = ({ classId }) => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [createDesc, setCreateDesc] = useState('');
  const [createWeight, setCreateWeight] = useState<number>(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editWeight, setEditWeight] = useState<number>(0);

  const loadGoals = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await GoalService.getGoals(classId);
      setGoals(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await GoalService.addGoal(classId, { description: createDesc, weight: createWeight });
      setCreateDesc('');
      setCreateWeight(0);
      await loadGoals();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startEdit = (g: Goal) => {
    setEditingId(g.id);
    setEditDesc(g.description);
    setEditWeight(g.weight);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setError('');
    try {
      await GoalService.updateGoal(classId, editingId, { description: editDesc, weight: editWeight });
      setEditingId(null);
      await loadGoals();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (goalId: string) => {
    if (!window.confirm('Delete this goal?')) return;
    setError('');
    try {
      await GoalService.deleteGoal(classId, goalId);
      await loadGoals();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleResetAll = async () => {
    const confirmed = window.confirm(
      `⚠️ Reset All Goals?\n\n` +
      `This will permanently delete ALL ${goals.length} goals from this class.\n\n` +
      `This action cannot be undone!\n\n` +
      `Are you sure you want to continue?`
    );

    if (!confirmed) return;

    setError('');
    setLoading(true);
    try {
      // Delete all goals one by one
      await Promise.all(goals.map(g => GoalService.deleteGoal(classId, g.id)));
      await loadGoals();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);

  return (
    <div className="goals-management">
      <div className="goals-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h3 style={{ fontSize: '2rem', fontWeight: '700', color: '#ffffff', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>📋 Goals Management</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {goals.length > 0 && (
            <>
              <div className="total-weight" style={{ 
                padding: '12px 20px', 
                backgroundColor: totalWeight === 100 ? '#22c55e' : totalWeight > 100 ? '#ef4444' : '#f59e0b',
                color: 'white',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '1.1rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}>
                Total Weight: {totalWeight}%
              </div>
              <a
                href="/classes/manage"
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'all 0.3s ease'
                }}
                title="Manage class enrollments"
              >
                👥 Gerenciar Matrículas
              </a>
              <button
                onClick={handleResetAll}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                  color: 'white',
                  transition: 'all 0.3s ease'
                }}
                title="Delete all goals at once"
              >
                🗑️ Reset All Goals
              </button>
            </>
          )}
        </div>
      </div>
      
      {loading && <div className="loading-message">⏳ Loading goals...</div>}
      {error && <div className="error-message">❌ {error}</div>}

      <div className="goals-list">
        {goals.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '2px dashed #dc2626' }}>
            <p style={{ fontSize: '1.3rem', marginBottom: '10px', fontWeight: '700', color: '#1a1a1a' }}>📝 No goals defined for this class yet.</p>
            <p style={{ fontSize: '1.1rem', color: '#4b5563', fontWeight: '500' }}>Add your first goal below to get started!</p>
          </div>
        ) : (
          <table className="goals-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '16px', fontSize: '1.1rem', fontWeight: '700', width: '40%' }}>DESCRIPTION</th>
                <th style={{ textAlign: 'center', padding: '16px', fontSize: '1.1rem', fontWeight: '700', width: '15%' }}>WEIGHT</th>
                <th style={{ textAlign: 'center', padding: '16px', fontSize: '1.1rem', fontWeight: '700', width: '20%' }}>CREATED</th>
                <th style={{ textAlign: 'center', padding: '16px', fontSize: '1.1rem', fontWeight: '700', width: '25%' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {goals.map(g => (
                <tr key={g.id} className="goal-item">
                  {editingId === g.id ? (
                    <td colSpan={4} style={{ backgroundColor: '#ffffff' }}>
                      <form onSubmit={handleUpdate} className="edit-goal-form" style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '15px'
                      }}>
                        <input 
                          value={editDesc} 
                          onChange={e => setEditDesc(e.target.value)}
                          placeholder="Description"
                          style={{ flex: 2, padding: '10px', fontSize: '1rem', border: '2px solid #1a1a1a', borderRadius: '6px', color: '#1a1a1a', fontWeight: '600' }}
                          required
                        />
                        <input 
                          type="number" 
                          value={editWeight} 
                          onChange={e => setEditWeight(parseInt(e.target.value) || 0)}
                          placeholder="Weight"
                          style={{ flex: 1, maxWidth: '120px', padding: '10px', fontSize: '1rem', border: '2px solid #1a1a1a', borderRadius: '6px', color: '#1a1a1a', fontWeight: '600' }}
                          min="0"
                          max="100"
                          required
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" style={{ backgroundColor: '#22c55e', padding: '10px 20px', fontSize: '0.95rem', fontWeight: '700', whiteSpace: 'nowrap' }}>💾 SAVE</button>
                          <button type="button" onClick={cancelEdit} style={{ backgroundColor: '#6b7280', padding: '10px 20px', fontSize: '0.95rem', fontWeight: '700', whiteSpace: 'nowrap' }}>❌ CANCEL</button>
                        </div>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td style={{ padding: '16px', fontSize: '1.1rem', fontWeight: '700', color: '#ffffff', backgroundColor: '#2d2d2d' }}>{g.description}</td>
                      <td style={{ textAlign: 'center', padding: '16px', fontWeight: '900', fontSize: '1.5rem', color: '#ff4444', backgroundColor: '#2d2d2d' }}>{g.weight}%</td>
                      <td style={{ textAlign: 'center', padding: '16px', fontSize: '1rem', color: '#e5e7eb', fontWeight: '600', backgroundColor: '#2d2d2d' }}>
                        {new Date(g.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ textAlign: 'center', padding: '16px', backgroundColor: '#2d2d2d' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <button onClick={() => startEdit(g)} style={{ padding: '10px 12px', fontSize: '0.9rem', fontWeight: '700', whiteSpace: 'nowrap' }}>✏️ EDIT</button>
                          <button onClick={() => handleDelete(g.id)} style={{ padding: '10px 12px', fontSize: '0.9rem', fontWeight: '700', backgroundColor: '#ef4444', whiteSpace: 'nowrap' }}>🗑️ DELETE</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="goals-create" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#ffffff', borderRadius: '12px', border: '2px solid #dc2626', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
        <h4 style={{ marginBottom: '15px', fontSize: '1.3rem', fontWeight: '700', color: '#1a1a1a' }}>➕ Add New Goal</h4>
        <form onSubmit={handleAdd} className="add-goal-form" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '700', fontSize: '1rem', color: '#1a1a1a' }}>Description</label>
            <input 
              placeholder="e.g., Requirements Analysis" 
              value={createDesc} 
              onChange={e => setCreateDesc(e.target.value)} 
              required 
              style={{ width: '100%', padding: '10px', fontSize: '1rem', border: '2px solid #1a1a1a', borderRadius: '6px' }}
            />
          </div>
          <div style={{ flex: 1, maxWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '700', fontSize: '1rem', color: '#1a1a1a' }}>Weight (%)</label>
            <input 
              type="number" 
              placeholder="0-100" 
              value={createWeight || ''} 
              onChange={e => setCreateWeight(parseInt(e.target.value) || 0)} 
              required 
              min="0"
              max="100"
              style={{ width: '100%', padding: '10px', fontSize: '1rem', border: '2px solid #1a1a1a', borderRadius: '6px' }}
            />
          </div>
          <button type="submit" style={{ padding: '12px 24px', fontSize: '1rem', fontWeight: '700' }}>➕ ADD GOAL</button>
        </form>
      </div>
    </div>
  );
};

export default GoalsManagement;
