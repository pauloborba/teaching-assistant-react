import React, { useEffect, useState } from 'react';
import ResponseService from '../../services/ResponseService';
import Header from '../../components/Header';
import CustomButton from '../../components/CustomButton';
import './ExamResponse.css';

export default function ExamResponse({ examId: propExamId = undefined as any } : { examId?: number | string }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [studentCpf, setStudentCpf] = useState('');
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [message, setMessage] = useState('');
  const [examId, setExamId] = useState<string | number | undefined>(propExamId);
  const [loadedExamId, setLoadedExamId] = useState<string | number | undefined>(undefined);

  // Load questions only when user requests (by clicking 'Carregar Prova') or when propExamId provided
  useEffect(() => {
    if (!propExamId) return;
    setExamId(propExamId);
  }, [propExamId]);

  const handleChange = (questionId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [String(questionId)]: value }));
  };

  const handleLoadExam = async () => {
    setMessage('');
    if (!examId && examId !== 0) {
      setMessage('Informe o ID da prova antes de carregar.');
      return;
    }

    setLoading(true);
    try {
      const qs = await ResponseService.getQuestions(examId as any);
      setQuestions(qs);
      setLoadedExamId(examId);
      // Reset previous answers
      setAnswers({});
    } catch (err) {
      console.error('Failed to load questions', err);
      setMessage('Não foi possível carregar a prova. Verifique o ID.');
      setQuestions([]);
      setLoadedExamId(undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setMessage('');
    if (!studentCpf) {
      setMessage('Informe o CPF do aluno antes de enviar.');
      return;
    }

    if (!loadedExamId) {
      setMessage('Carregue a prova antes de enviar as respostas.');
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
      // use loadedExamId which is guaranteed to be set when submitting
      await ResponseService.submitResponse(loadedExamId as string | number, studentCpf, payload, token);
      setMessage('Respostas enviadas com sucesso.');
      setAnswers({});
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Erro ao enviar respostas.');
    }
  };

  return (
    <div className="exam-response-page">
      <Header />

      <div className="exam-response-container">
        <div className="page-header">
          <div className="page-title">
            <h2>Responder Prova</h2>
            {loadedExamId ? (
              <span className="pill">Exame {String(loadedExamId)}</span>
            ) : (
              <span className="muted">Informe o ID da prova para carregar.</span>
            )}
          </div>
          {loading && <div className="status-chip">Carregando questões...</div>}
        </div>

        <div className="card">
          <div className="field-row">
            <div className="field">
              <label>ID da prova</label>
              <input
                className="text-input"
                value={examId ?? ''}
                onChange={e => setExamId(e.target.value)}
                placeholder="ID da prova"
              />
            </div>
            <button className="ghost-button" type="button" onClick={handleLoadExam}>
              Carregar Prova
            </button>
          </div>

          <div className="field">
            <label>CPF do aluno</label>
            <input
              className="text-input"
              value={studentCpf}
              onChange={e => setStudentCpf(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3>Questões</h3>
            {loadedExamId && <span className="muted">Prova carregada: {String(loadedExamId)}</span>}
          </div>

          <div className="questions-list">
            {questions.map(q => (
              <div key={q.id} className="question-item">
                <div className="question-title">{q.question}</div>
                {q.type === 'closed' && Array.isArray(q.options) ? (
                  <div className="radio-group">
                    {q.options.map((opt: any) => (
                      <label key={opt.id} className="radio-option">
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt.id}
                          checked={String(answers[q.id]) === String(opt.id)}
                          onChange={() => handleChange(q.id, String(opt.id))}
                        />
                        <span>{opt.option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <textarea
                    className="text-area"
                    value={answers[q.id] ?? ''}
                    onChange={e => handleChange(q.id, e.target.value)}
                  />
                )}
              </div>
            ))}

            {!questions.length && (
              <div className="empty-state">
                Carregue uma prova para visualizar e responder as questões.
              </div>
            )}
          </div>
        </div>

        <div className="actions-row">
          <CustomButton label="Enviar respostas" onClick={handleSubmit} />
        </div>

        {message && <div className="feedback-message">{message}</div>}
      </div>
    </div>
  );
}
