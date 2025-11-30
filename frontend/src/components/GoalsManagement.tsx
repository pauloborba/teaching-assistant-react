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
        <h3>📋 Goals Management</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {goals.length > 0 && (
            <>
              <div className="total-weight" style={{ 
                padding: '8px 16px', 
                backgroundColor: totalWeight === 100 ? '#22c55e' : totalWeight > 100 ? '#ef4444' : '#f59e0b',
                color: 'white',
                borderRadius: '8px',
                fontWeight: 'bold'
              }}>
                Total Weight: {totalWeight}%
              </div>
              <button
                onClick={handleResetAll}
                style={{
                  padding: '8px 16px',
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
          <div className="empty-state" style={{ padding: '30px', textAlign: 'center', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <p style={{ fontSize: '16px', marginBottom: '10px' }}>📝 No goals defined for this class yet.</p>
            <p style={{ fontSize: '14px', color: '#666' }}>Add your first goal below to get started!</p>
          </div>
        ) : (
          <table className="goals-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px' }}>Description</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Weight</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Created</th>
                <th style={{ textAlign: 'center', padding: '12px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {goals.map(g => (
                <tr key={g.id} className="goal-item">
                  {editingId === g.id ? (
                    <td colSpan={4}>
                      <form onSubmit={handleUpdate} className="edit-goal-form" style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        padding: '10px'
                      }}>
                        <input 
                          value={editDesc} 
                          onChange={e => setEditDesc(e.target.value)}
                          placeholder="Description"
                          style={{ flex: 2 }}
                          required
                        />
                        <input 
                          type="number" 
                          value={editWeight} 
                          onChange={e => setEditWeight(parseInt(e.target.value) || 0)}
                          placeholder="Weight"
                          style={{ flex: 1, maxWidth: '100px' }}
                          min="0"
                          max="100"
                          required
                        />
                        <button type="submit" style={{ backgroundColor: '#22c55e' }}>💾 Save</button>
                        <button type="button" onClick={cancelEdit} style={{ backgroundColor: '#6b7280' }}>❌ Cancel</button>
                      </form>
                    </td>
                  ) : (
                    <>
                      <td style={{ padding: '12px' }}><strong>{g.description}</strong></td>
                      <td style={{ textAlign: 'center', padding: '12px', fontWeight: 'bold', color: '#dc2626' }}>{g.weight}%</td>
                      <td style={{ textAlign: 'center', padding: '12px', fontSize: '12px', color: '#666' }}>
                        {new Date(g.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ textAlign: 'center', padding: '12px' }}>
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <button onClick={() => startEdit(g)} style={{ padding: '4px 8px', fontSize: '12px' }}>✏️ Edit</button>
                          <button onClick={() => handleDelete(g.id)} style={{ padding: '4px 8px', fontSize: '12px', backgroundColor: '#ef4444' }}>🗑️ Delete</button>
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

      <div className="goals-create" style={{ marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '15px' }}>➕ Add New Goal</h4>
        <form onSubmit={handleAdd} className="add-goal-form" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Description</label>
            <input 
              placeholder="e.g., Requirements Analysis" 
              value={createDesc} 
              onChange={e => setCreateDesc(e.target.value)} 
              required 
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1, maxWidth: '150px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Weight (%)</label>
            <input 
              type="number" 
              placeholder="0-100" 
              value={createWeight || ''} 
              onChange={e => setCreateWeight(parseInt(e.target.value) || 0)} 
              required 
              min="0"
              max="100"
              style={{ width: '100%' }}
            />
          </div>
          <button type="submit" style={{ padding: '10px 20px' }}>➕ Add Goal</button>
        </form>
      </div>
    </div>
  );
};

export default GoalsManagement;
