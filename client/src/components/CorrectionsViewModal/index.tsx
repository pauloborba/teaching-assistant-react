import React, { useState, useEffect } from 'react';
import Modal from '../Modal';
import CustomButton from '../CustomButton';
import CorrectionViewService, { CorrectionGrade } from '../../services/CorrectionViewService';
import './CorrectionsViewModal.css';

interface CorrectionsViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  examId: number | null;
}

export default function CorrectionsViewModal({
  isOpen,
  onClose,
  examId,
}: CorrectionsViewModalProps) {
  const [grades, setGrades] = useState<CorrectionGrade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionIds, setQuestionIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen && examId !== null) {
      loadGrades();
    } else {
      setGrades([]);
      setQuestionIds([]);
      setError(null);
    }
  }, [isOpen, examId]);

  // Ajusta o tamanho do modal quando está aberto
  useEffect(() => {
    if (isOpen) {
      // Encontra o modal-container e ajusta o max-width
      const modalContainer = document.querySelector('.modal-container');
      if (modalContainer) {
        (modalContainer as HTMLElement).style.maxWidth = '90vw';
        (modalContainer as HTMLElement).style.width = '100%';
      }
    }
  }, [isOpen]);

  const loadGrades = async () => {
    if (examId === null) return;

    setLoading(true);
    setError(null);
    try {
      const data = await CorrectionViewService.getGrades(examId);
      setGrades(data);

      // Extrair todos os questionIds únicos de todas as respostas
      const allQuestionIds = new Set<number>();
      data.forEach((student) => {
        student.answers.forEach((answer) => {
          allQuestionIds.add(answer.questionId);
        });
      });
      setQuestionIds(Array.from(allQuestionIds).sort((a, b) => a - b));
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar correções');
      setGrades([]);
    } finally {
      setLoading(false);
    }
  };

  const getGradeForQuestion = (student: CorrectionGrade, questionId: number): number | null => {
    const answer = student.answers.find((a) => a.questionId === questionId);
    return answer ? answer.grade : null;
  };

  const calculateAverage = (student: CorrectionGrade): number | null => {
    const validGrades = student.answers
      .map((a) => a.grade)
      .filter((g) => g !== null) as number[];

    if (validGrades.length === 0) return null;
    if (validGrades.length !== questionIds.length) return null; // Nem todas as questões têm nota

    const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
    return Math.round((sum / validGrades.length) * 100) / 100; // Arredonda para 2 casas decimais
  };

  return (
    <Modal
      title="Visualizar Correções"
      isOpen={isOpen}
      onClose={onClose}
    >
      <div className="corrections-view-content">
        {loading && (
          <div className="corrections-loading">
            <p>Carregando correções...</p>
          </div>
        )}

        {error && (
          <div className="corrections-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && grades.length === 0 && (
          <div className="corrections-empty">
            <p>Nenhuma correção encontrada para este exame.</p>
          </div>
        )}

        {!loading && !error && grades.length > 0 && (
          <div className="corrections-table-container">
            <div className="corrections-table-wrapper">
              <table className="corrections-table">
                <thead>
                  <tr>
                    <th className="sticky-col sticky-col-left">Nome</th>
                    <th className="sticky-col sticky-col-left-2">CPF</th>
                    {questionIds.map((qId) => (
                      <th key={qId} className="question-header">
                        Q{qId}
                      </th>
                    ))}
                    <th className="sticky-col sticky-col-right average-header">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((student, index) => {
                    const average = calculateAverage(student);
                    return (
                      <tr key={`${student.studentCPF}-${index}`}>
                        <td className="sticky-col sticky-col-left">{student.name}</td>
                        <td className="sticky-col sticky-col-left-2">{student.studentCPF}</td>
                        {questionIds.map((qId) => {
                          const grade = getGradeForQuestion(student, qId);
                          return (
                            <td key={qId} className="grade-cell">
                              {grade !== null ? (
                                <span className={`grade-value grade-${grade >= 70 ? 'pass' : grade >= 50 ? 'medium' : 'fail'}`}>
                                  {grade}
                                </span>
                              ) : (
                                <span className="grade-not-corrected">Não corrigida</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="sticky-col sticky-col-right average-cell">
                          {average !== null ? (
                            <span className={`average-value average-${average >= 70 ? 'pass' : average >= 50 ? 'medium' : 'fail'}`}>
                              {average.toFixed(2)}
                            </span>
                          ) : (
                            <span className="average-not-available">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

