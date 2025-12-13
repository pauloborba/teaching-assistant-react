// StudentScriptAnswerPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Script } from '../../types/Script';
import { ScriptAnswer } from '../../types/ScriptAnswer';
import ScriptService from '../../services/ScriptService';
import { ScriptAnswerService } from '../../services/ScriptAnswerService';
import AvailableScriptsList from './AvailableScriptsList';
import ActiveScriptAnswer from './ActiveScriptAnswer';

interface Props {
  studentCPF: string;
  classId: string;
  onError: (message: string) => void;
}

export default function StudentScriptAnswerPage({ studentCPF, classId, onError }: Props) {
  const [availableScripts, setAvailableScripts] = useState<Script[]>([]);
  const [activeScriptAnswer, setActiveScriptAnswer] = useState<ScriptAnswer | null>(null);
  const [loading, setLoading] = useState(false);

  // Shared loader: parallel fetch + unmount safety via optional cancelled ref
  const loadData = useCallback(async (cancelled?: { current: boolean }) => {
    setLoading(true);
    try {
      const [scripts, studentAnswers] = await Promise.all([
        ScriptService.getAllScripts(),
        ScriptAnswerService.getScriptAnswersByEnrollment(classId, studentCPF)
      ]);

      if (cancelled?.current) return;

      const active = studentAnswers.find(sa => sa.status === 'in_progress') || null;
      setActiveScriptAnswer(active);

      // Avoid 409 from API: hide scripts already answered (any status) for this student/class
      const alreadyAnswered = new Set(studentAnswers.map(sa => sa.scriptId));
      const notAnswered = scripts.filter(s => !alreadyAnswered.has(s.id));
      setAvailableScripts(notAnswered);
    } catch (error) {
      if (!cancelled?.current) {
        const message = error instanceof Error ? error.message : 'Failed to load scripts';
        onError(message);
        console.error(error);
        setAvailableScripts([]);
        setActiveScriptAnswer(null);
      }
    } finally {
      if (!cancelled?.current) {
        setLoading(false);
      }
    }
  }, [classId, studentCPF, onError]);

  // Load available scripts and active script answers
  useEffect(() => {
    const cancelled = { current: false };
    loadData(cancelled);
    return () => { cancelled.current = true; };
  }, [loadData]);

  const handleStartScript = async (scriptId: string) => {
    try {
      setLoading(true);
      const newAnswer = await ScriptAnswerService.createScriptAnswer({
        scriptId,
        classId,
        studentId: studentCPF
      });
      setActiveScriptAnswer(newAnswer);
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        onError('You already have an active script answer. Please complete it first.');
      } else if (error.message.includes('not enrolled')) {
        onError('You are not enrolled in this class.');
      } else {
        onError('Failed to start script');
      }
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFinishScript = () => {
    setActiveScriptAnswer(null);
    loadData();
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading...</div>;
  }

  if (activeScriptAnswer) {
    return (
      <ActiveScriptAnswer
        scriptAnswer={activeScriptAnswer}
        onFinish={handleFinishScript}
        onError={onError}
      />
    );
  }

  return (
    <AvailableScriptsList
      scripts={availableScripts}
      onStartScript={handleStartScript}
    />
  );
}
