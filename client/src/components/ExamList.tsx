import React, { useEffect, useState } from 'react';

import { Exam, ExamDetail } from '../types/Exam';
import { examService } from '../services/ExamService';

const ExamList: React.FC = () => {
    const [exams, setExams] = useState<Exam[]>([]);
    const [selectedExam, setSelectedExam] = useState<ExamDetail | null>(null);

    const [loading, setLoading] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        examService.getAllExams()
            .then(data => {
                if (active) {
                    setExams(data);
                }
            })
            .catch(error => {
                if (active) {
                    setError(error instanceof Error
                        ? error.message
                        : 'Não foi possível carregar as provas'
                    );
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };
    }, []);
    
    const handleViewExam = async (code: string) => {
        setError('');
        setLoadingDetail(true);
        setSelectedExam(null);

        try {
            const exam = await examService.getExamByCode(code);
            setSelectedExam(exam);
        } catch (error) {
            setError(error instanceof Error
                ? error.message
                : 'Não foi possível consultar a prova'
            );
        } finally {
            setLoadingDetail(false);
        }
    };

      return (
    <section className="exam-history">
      <h2>Provas criadas</h2>

      {error && (
        <p role="alert" className="exam-feedback-error">
          {error}
        </p>
      )}

      {loading ? (
        <p>Carregando provas...</p>
      ) : exams.length === 0 ? (
        <p>Não há provas cadastradas.</p>
      ) : (
        <ul className="exam-question-list">
          {exams.map(exam => (
            <li key={exam.code} className="exam-question-item">
              <div>
                <strong>{exam.name}</strong>
                <p>
                  {exam.questionCodes.length} questão(ões)
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleViewExam(exam.code)}
              >
                Visualizar prova
              </button>
            </li>
          ))}
        </ul>
      )}

      {loadingDetail && <p>Carregando detalhes...</p>}

      {selectedExam && (
        <div className="exam-section">
          <h3>{selectedExam.name}</h3>

          <p>
            <strong>Assuntos abordados:</strong>{' '}
            {selectedExam.subjects.join(', ')}
          </p>

          <h4>Questões da prova</h4>

          <ol>
            {selectedExam.questions.map(question => (
              <li key={question.code}>
                <strong>{question.statement}</strong>
                <p>Assunto: {question.subject}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
};

export default ExamList;
