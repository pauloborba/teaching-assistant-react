import React, { useEffect, useState } from 'react';
import ResponseService from '../../services/ResponseService';
import Header from '../../components/Header';
import CustomButton from '../../components/CustomButton';

export default function ExamResponse({ examId = 1 as any } : { examId?: number | string }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentCpf, setStudentCpf] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const qs = await ResponseService.getQuestions(examId);
        setQuestions(qs);
      } catch (err) {
        console.error('Failed to load questions', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId]);

  const handleChange = (questionId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [String(questionId)]: value }));
  };

  const handleSubmit = async () => {
    setMessage('');
    if (!studentCpf) {
      setMessage('Informe o CPF do aluno antes de enviar.');
      return;
    }

    // Build answers array expected by server
    const payload = questions.map(q => ({ questionId: q.id, answer: answers[String(q.id)] ?? '' }));

    // Basic validation
    const incomplete = payload.some((a: any) => a.answer === null || a.answer === undefined || String(a.answer).trim() === '');
    if (incomplete) {
      setMessage('Por favor responda todas as questões antes de enviar.');
      return;
    }

    try {
      // Simulate a student token in Authorization header
      const token = 'student-token';
      await ResponseService.submitResponse(examId, studentCpf, payload, token);
      setMessage('Respostas enviadas com sucesso.');
      setAnswers({});
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Erro ao enviar respostas.');
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <Header />
      <h2>Responder Prova (Exame {String(examId)})</h2>
      {loading && <div>Carregando questões...</div>}

      <div style={{ marginBottom: 12 }}>
        <label>CPF do aluno:</label>
        <input value={studentCpf} onChange={e => setStudentCpf(e.target.value)} placeholder="000.000.000-00" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {questions.map(q => (
          <div key={q.id} style={{ padding: 8, border: '1px solid #ddd' }}>
            <div style={{ fontWeight: 600 }}>{q.question}</div>
            {q.type === 'closed' && Array.isArray(q.options) ? (
              q.options.map((opt: any) => (
                <label key={opt.id} style={{ display: 'block' }}>
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    value={opt.id}
                    checked={String(answers[q.id]) === String(opt.id)}
                    onChange={() => handleChange(q.id, String(opt.id))}
                  />{' '}
                  {opt.option}
                </label>
              ))
            ) : (
              <textarea value={answers[q.id] ?? ''} onChange={e => handleChange(q.id, e.target.value)} />
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <CustomButton label="Enviar respostas" onClick={handleSubmit} />
      </div>

      {message && <div style={{ marginTop: 12 }}>{message}</div>}
    </div>
  );
}
