import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Exam, ExamDetail } from '../types/Exam';
import { examService } from '../services/ExamService';
import './ExamList.css';

const ExamList: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    let active = true;

    examService.getAllExams()
      .then(data => {
        if (active) setExams(data);
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error
            ? err.message
            : 'Não foi possível carregar as provas');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      requestIdRef.current += 1;
    };
  }, []);

  // Enquanto o pop-up está aberto, bloqueia a rolagem da página,
  // coloca o foco no botão Fechar e permite fechá-lo com Escape.
  useEffect(() => {
    if (!selectedExam) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedExam(null);
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
      lastTriggerRef.current?.focus();
    };
  }, [selectedExam]);

  const handleViewExam = async (
    code: string,
    trigger: HTMLButtonElement
  ) => {
    lastTriggerRef.current = trigger;
    const requestId = ++requestIdRef.current;

    setError('');
    setSelectedExam(null);
    setLoadingDetail(true);

    try {
      const detail = await examService.getExamByCode(code);
      if (requestId === requestIdRef.current) {
        setSelectedExam(detail);
      }
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error
          ? err.message
          : 'Não foi possível consultar a prova');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingDetail(false);
      }
    }
  };

  const closeModal = () => setSelectedExam(null);

  // Mantém a navegação por Tab dentro do pop-up.
  const handleModalKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const modal = selectedExam ? createPortal(
    <div
      className="exl-modal-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      <div
        className="exl-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exl-modal-title"
        onKeyDown={handleModalKeyDown}
        data-testid="exam-details-modal"
      >
        <header className="exl-modal-header">
          <div className="exl-modal-heading">
            <span className="exl-eyebrow">DETALHES DA PROVA</span>
            <h3 id="exl-modal-title">{selectedExam.name}</h3>
            <p>Visualize os assuntos, enunciados e alternativas desta prova.</p>
          </div>
          <button
            ref={closeButtonRef}
            className="exl-icon-close"
            type="button"
            onClick={closeModal}
            aria-label="Fechar detalhes da prova"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="exl-modal-body">
          <section className="exl-summary" aria-label="Resumo da prova">
            <div className="exl-summary-count">
              <strong>{selectedExam.questions.length}</strong>
              <span>{selectedExam.questions.length === 1 ? 'questão' : 'questões'}</span>
            </div>
            <div className="exl-subjects-line">
              <strong>Assuntos abordados:</strong>
              <div className="exl-subject-pills">
                {selectedExam.subjects.map(subject => (
                  <span key={subject} className="exl-subject-pill">
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <h4 className="exl-questions-title">Questões da prova</h4>

          {selectedExam.questions.length === 0 ? (
            <p>Não há questões associadas a esta prova.</p>
          ) : (
            <div className="exl-detail-list">
              {selectedExam.questions.map((question, questionIndex) => (
                <article key={question.code} className="exl-question-card">
                  <div className="exl-question-card-top">
                    <span className="exl-question-number">
                      QUESTÃO {String(questionIndex + 1).padStart(2, '0')}
                    </span>
                    <span className="exl-subject-pill">{question.subject}</span>
                  </div>

                  <h5 className="exl-statement">{question.statement}</h5>
                  <div className="exl-section-label">ALTERNATIVAS</div>

                  <ol className="exl-alternatives">
                    {question.alternatives.map((alternative, index) => (
                      <li
                        key={index}
                        className={alternative.isTrue
                          ? 'exl-alternative exl-alternative-true'
                          : 'exl-alternative exl-alternative-false'}
                      >
                        <span className="exl-letter" aria-hidden="true">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="exl-alternative-text">{alternative.text}</span>
                        <span className="exl-classification">
                          <span aria-hidden="true">{alternative.isTrue ? '✓' : '×'}</span>
                          {alternative.isTrue ? 'Verdadeira' : 'Falsa'}
                        </span>
                      </li>
                    ))}
                  </ol>

                  <div className="exl-question-footer">
                    {question.alternatives.length}{' '}
                    {question.alternatives.length === 1 ? 'alternativa' : 'alternativas'}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="exl-modal-footer">
          <button type="button" className="exl-close-button" onClick={closeModal}>
            Fechar
          </button>
        </footer>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <section className="exam-history exl-history">
        <header className="exl-history-header">
          <span className="exl-eyebrow">BANCO DE PROVAS</span>
          <h2>Provas criadas ({exams.length})</h2>
          <p>Consulte as provas e visualize suas questões.</p>
        </header>

        {error && (
          <p role="alert" className="exam-feedback-error exl-error">{error}</p>
        )}

        {loading ? (
          <p className="exl-empty">Carregando provas...</p>
        ) : exams.length === 0 ? (
          <p className="exl-empty">Não há provas cadastradas.</p>
        ) : (
          <ul className="exl-exam-list">
            {exams.map(exam => (
              <li key={exam.code} className="exl-exam-item">
                <div className="exl-exam-info">
                  <strong>{exam.name}</strong>
                  <p>{exam.questionCodes.length} questão(ões)</p>
                </div>
                <button
                  className="exl-view-button"
                  type="button"
                  disabled={loadingDetail}
                  onClick={event => handleViewExam(exam.code, event.currentTarget)}
                >
                  Visualizar prova
                </button>
              </li>
            ))}
          </ul>
        )}

        {loadingDetail && <p className="exl-loading-detail">Carregando detalhes...</p>}
      </section>
      {modal}
    </>
  );
};

export default ExamList;
