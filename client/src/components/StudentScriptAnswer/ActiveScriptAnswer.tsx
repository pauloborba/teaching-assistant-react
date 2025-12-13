// ActiveScriptAnswer.tsx
import React, { useState, useEffect } from 'react';
import { ScriptAnswer, TaskAnswer } from '../../types/ScriptAnswer';
import { Script } from '../../types/Script';
import { Task } from '../../types/Task';
import ScriptService from '../../services/ScriptService';
import { ScriptAnswerService } from '../../services/ScriptAnswerService';
import TaskAnswerForm from './TaskAnswerForm';

interface Props {
  scriptAnswer: ScriptAnswer;
  onFinish: () => void;
  onError: (message: string) => void;
}

export default function ActiveScriptAnswer({ scriptAnswer, onFinish, onError }: Props) {
  const [script, setScript] = useState<Script | null>(null);
  const [current, setCurrent] = useState<ScriptAnswer>(scriptAnswer);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadScript();
  }, [scriptAnswer.scriptId]);

  useEffect(() => {
    // Auto-refresh script answer every 5 seconds to check for updates
    const interval = setInterval(async () => {
      try {
        const updated = await ScriptAnswerService.getScriptAnswerById(scriptAnswer.id);
        setCurrent(updated);
        
        // If finished, redirect
        if (updated.status === 'finished') {
          clearInterval(interval);
          setTimeout(onFinish, 1000);
        }
      } catch (error) {
        console.error('Failed to refresh script answer:', error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [scriptAnswer.id]);

  const loadScript = async () => {
    try {
      const scriptData = await ScriptService.getScriptById(scriptAnswer.scriptId);
      setScript(scriptData);
    } catch (error) {
      onError('Failed to load script details');
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      setLoading(true);
      await ScriptAnswerService.startTask(current.id, taskId);
      const updated = await ScriptAnswerService.getScriptAnswerById(current.id);
      setCurrent(updated);
    } catch (error: any) {
      onError(error.message || 'Failed to start task');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTask = async (taskId: string, answer: string) => {
    try {
      setLoading(true);
      await ScriptAnswerService.submitTask(current.id, taskId, answer);
      const updated = await ScriptAnswerService.getScriptAnswerById(current.id);
      setCurrent(updated);
      
      // Move to next task if not the last one
      if (script && currentTaskIndex < script.tasks!.length - 1) {
        setCurrentTaskIndex(currentTaskIndex + 1);
      }
      
      // If this was the last task and script is finished, show completion
      if (updated.status === 'finished') {
        setTimeout(onFinish, 2000);
      }
    } catch (error: any) {
      onError(error.message || 'Failed to submit task');
    } finally {
      setLoading(false);
    }
  };

  if (!script || !script.tasks || script.tasks.length === 0) {
    return <div style={{ padding: '2rem' }}>Loading script...</div>;
  }

  const currentTask = script.tasks[currentTaskIndex];
  const taskAnswer = current.answers.find(ta => ta.task === currentTask.id);

  const getTaskStatus = (task: Task): 'pending' | 'started' | 'submitted' | 'timed_out' => {
    const answer = current.answers.find(ta => ta.task === task.id);
    return answer?.status || 'pending';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getElapsedTime = (): string => {
    if (!current.started_at) return '0:00';
    const elapsed = Math.floor((Date.now() - current.started_at) / 1000);
    return formatTime(elapsed);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>
          {script.title || 'Script'}
        </h1>
        <div style={{ display: 'flex', gap: '2rem', fontSize: '0.9rem', opacity: 0.95 }}>
          <span>⏱️ Time Elapsed: {getElapsedTime()}</span>
          <span>📝 Task {currentTaskIndex + 1} of {script.tasks.length}</span>
          <span>Status: {current.status === 'finished' ? '✅ Finished' : '🔄 In Progress'}</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem' }}>
        {/* Task Navigation Sidebar */}
        <div>
          <h3 style={{ marginTop: 0 }}>Tasks</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {script.tasks.map((task, index) => {
              const status = getTaskStatus(task);
              const isActive = index === currentTaskIndex;
              
              return (
                <button
                  key={task.id}
                  onClick={() => setCurrentTaskIndex(index)}
                  disabled={current.status === 'finished'}
                  style={{
                    padding: '0.75rem',
                    textAlign: 'left',
                    border: isActive ? '2px solid #667eea' : '1px solid #ddd',
                    borderRadius: '6px',
                    background: isActive ? '#f0f4ff' : 'white',
                    cursor: current.status === 'finished' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: current.status === 'finished' ? 0.6 : 1
                  }}
                >
                  <div style={{ fontWeight: isActive ? '600' : '400', marginBottom: '0.25rem' }}>
                    Task {index + 1}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {status === 'pending' && '⚪ Not Started'}
                    {status === 'started' && '🟡 In Progress'}
                    {status === 'submitted' && '✅ Submitted'}
                    {status === 'timed_out' && '⏰ Timed Out'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Task Area */}
        <div>
          {current.status === 'finished' ? (
            <div style={{
              padding: '3rem',
              textAlign: 'center',
              background: '#f0fdf4',
              border: '2px solid #86efac',
              borderRadius: '12px'
            }}>
              <h2 style={{ color: '#16a34a', marginBottom: '1rem' }}>
                🎉 Script Completed!
              </h2>
              <p style={{ color: '#666', marginBottom: '2rem' }}>
                You have successfully completed all tasks in this script.
              </p>
              <button
                onClick={onFinish}
                style={{
                  padding: '0.75rem 2rem',
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                Back to Scripts
              </button>
            </div>
          ) : (
            <TaskAnswerForm
              task={currentTask}
              taskAnswer={taskAnswer}
              onStart={handleStartTask}
              onSubmit={handleSubmitTask}
              loading={loading}
              isLastTask={currentTaskIndex === script.tasks.length - 1}
            />
          )}
        </div>
      </div>
    </div>
  );
}
