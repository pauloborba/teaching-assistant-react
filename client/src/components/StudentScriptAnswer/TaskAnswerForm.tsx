// TaskAnswerForm.tsx
import React, { useState, useEffect } from 'react';
import { Task } from '../../types/Task';
import { TaskAnswer } from '../../types/ScriptAnswer';

interface Props {
  task: Task;
  taskAnswer?: TaskAnswer;
  onStart: (taskId: string) => void;
  onSubmit: (taskId: string, answer: string) => void;
  loading: boolean;
  isLastTask: boolean;
}

export default function TaskAnswerForm({ task, taskAnswer, onStart, onSubmit, loading, isLastTask }: Props) {
  const [answer, setAnswer] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // Load existing answer if available
    if (taskAnswer?.answer) {
      setAnswer(taskAnswer.answer);
    }
  }, [taskAnswer]);

  useEffect(() => {
    // Update elapsed time if task is started
    if (taskAnswer?.status === 'started' && taskAnswer.started_at) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - taskAnswer.started_at!) / 1000);
        setElapsedTime(elapsed);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [taskAnswer]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartClick = () => {
    onStart(task.id);
  };

  const handleSubmitClick = () => {
    if (answer.trim()) {
      onSubmit(task.id, answer.trim());
    }
  };

  const getTaskStatus = () => {
    if (!taskAnswer) return 'pending';
    return taskAnswer.status || 'pending';
  };

  const status = getTaskStatus();

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '12px',
      padding: '2rem',
      background: 'white',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}>
      {/* Task Description */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>
          {task.statement || 'Task'}
        </h2>
        
        {status === 'started' && (
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: '6px',
            color: '#92400e',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            ⏱️ Time: {formatTime(elapsedTime)}
          </div>
        )}

        {status === 'submitted' && (
          <div style={{
            display: 'inline-block',
            padding: '0.5rem 1rem',
            background: '#d1fae5',
            border: '1px solid #6ee7b7',
            borderRadius: '6px',
            color: '#065f46',
            fontSize: '0.9rem',
            fontWeight: '500'
          }}>
            ✅ Submitted
            {taskAnswer?.submitted_at && taskAnswer.started_at && (
              <span style={{ marginLeft: '0.5rem' }}>
                (Time taken: {formatTime(Math.floor((taskAnswer.submitted_at - taskAnswer.started_at) / 1000))})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Answer Area */}
      {status === 'pending' ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#666', marginBottom: '2rem', fontSize: '1.1rem' }}>
            Click the button below to start this task and begin the timer.
          </p>
          <button
            onClick={handleStartClick}
            disabled={loading}
            style={{
              padding: '1rem 3rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'opacity 0.2s'
            }}
          >
            {loading ? 'Starting...' : 'Start Task'}
          </button>
        </div>
      ) : status === 'submitted' ? (
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '1.5rem'
        }}>
          <h4 style={{ marginTop: 0, marginBottom: '1rem', color: '#666' }}>Your Answer:</h4>
          <div style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: '1.6',
            color: '#333'
          }}>
            {taskAnswer?.answer || 'No answer provided'}
          </div>
          
          {taskAnswer?.comments && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#666' }}>
                Teacher Comments:
              </h4>
              <div style={{
                background: '#fef3c7',
                padding: '1rem',
                borderRadius: '6px',
                borderLeft: '4px solid #fbbf24',
                color: '#78350f'
              }}>
                {taskAnswer.comments}
              </div>
            </div>
          )}

          {taskAnswer?.grade && (
            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#666' }}>
                Grade:
              </h4>
              <div style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                background: '#dbeafe',
                borderRadius: '6px',
                fontWeight: '600',
                fontSize: '1.1rem',
                color: '#1e40af'
              }}>
                {taskAnswer.grade}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer here..."
            disabled={loading}
            style={{
              width: '100%',
              minHeight: '250px',
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '1rem',
              fontFamily: 'inherit',
              resize: 'vertical',
              marginBottom: '1.5rem',
              boxSizing: 'border-box'
            }}
          />

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSubmitClick}
              disabled={loading || !answer.trim()}
              style={{
                padding: '0.75rem 2rem',
                background: answer.trim() 
                  ? (isLastTask 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')
                  : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: (loading || !answer.trim()) ? 'not-allowed' : 'pointer',
                opacity: (loading || !answer.trim()) ? 0.6 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {loading ? 'Submitting...' : (isLastTask ? '✓ Submit & Finish' : '→ Submit & Next')}
            </button>
          </div>

          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#0c4a6e'
          }}>
            💡 <strong>Tip:</strong> Once you submit this answer, you won't be able to change it.
            {isLastTask && ' This is the last task - submitting will complete the entire script!'}
          </div>
        </div>
      )}
    </div>
  );
}
