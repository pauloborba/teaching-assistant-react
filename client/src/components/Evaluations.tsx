import React, { useState, useEffect, useCallback } from 'react';
import { Class } from '../types/Class';
import ClassService from '../services/ClassService';
import EnrollmentService from '../services/EnrollmentService';
import InfoButton from './InfoButton';
import { ImportGradeComponent } from './ImportGrade';

interface EvaluationsProps {
  onError: (errorMessage: string) => void;
}

type ViewMode = 'evaluations' | 'self-evaluations' | 'comparison';

const Evaluations: React.FC<EvaluationsProps> = ({ onError }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    // Load previously selected class from localStorage
    return localStorage.getItem('evaluations-selected-class') || '';
  });
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('evaluations');

  // Predefined evaluation goals
  const evaluationGoals = [
    'Requirements',
    'Configuration Management',
    'Project Management',
    'Design',
    'Tests',
    'Refactoring'
  ];

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const classesData = await ClassService.getAllClasses();
      setClasses(classesData);
    } catch (error) {
      onError(`Failed to load classes: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Load all classes on component mount
  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Update selected class when selectedClassId changes
  useEffect(() => {
    if (selectedClassId) {
      const classObj = classes.find(c => c.id === selectedClassId);
      setSelectedClass(classObj || null);
    } else {
      setSelectedClass(null);
    }
  }, [selectedClassId, classes]);

  const handleClassSelection = (classId: string) => {
    setSelectedClassId(classId);
    // Save selected class to localStorage for persistence
    if (classId) {
      localStorage.setItem('evaluations-selected-class', classId);
    } else {
      localStorage.removeItem('evaluations-selected-class');
    }
  };

  const handleEvaluationChange = async (studentCPF: string, goal: string, grade: string) => {
    if (!selectedClass) {
      onError('No class selected');
      return;
    }

    try {
      await EnrollmentService.updateEvaluation(selectedClass.id, studentCPF, goal, grade);
      // Reload classes to get updated enrollment data
      await loadClasses();
    } catch (error) {
      onError(`Failed to update evaluation: ${(error as Error).message}`);
    }
  };

  const getDiscrepancyClass = (evaluation: string | undefined, selfEvaluation: string | undefined): string => {
    if (!evaluation || !selfEvaluation) return '';
    if (evaluation === selfEvaluation) return 'match';
    return 'discrepancy';
  };

  const compareGoal = (teacherEval: string | null | undefined, selfEval: string | null | undefined): boolean => {
    // Hierarquia das notas
    const hierarchy: Record<string, number> = { MA: 3, MPA: 2, MANA: 1 };

    const t = teacherEval && hierarchy[teacherEval] ? hierarchy[teacherEval] : null;
    const s = selfEval && hierarchy[selfEval] ? hierarchy[selfEval] : null;

    // Sem discrepância se qualquer nota estiver vazia ou inválida
    if (t === null || s === null) return false;

    return t < s;
  };

  const getStudentDiscrepancyInfo = (
    evaluationGoals: string[],
    studentEvaluations: Record<string, string>,
    studentSelfEvaluations: Record<string, string>
  ) => {
    let total = 0;
    let discrepant = 0;

    for (const goal of evaluationGoals) {
      const teacherEval = studentEvaluations[goal] || "";
      const selfEval = studentSelfEvaluations[goal] || "";

      if (teacherEval || selfEval) {
        total++;
        if (compareGoal(teacherEval, selfEval)) discrepant++;
      }
    }

    const percentage = total === 0 ? 0 : Math.round((discrepant / total) * 100);

    return {
      percentage,
      highlight: percentage > 25
    };
  };

  if (isLoading) {
    return (
      <div className="evaluation-section">
        <h3>Evaluations</h3>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Loading classes...
        </div>
      </div>
    );
  }

  return (
    <div className="evaluation-section">
      <h3>Evaluations</h3>

      {/* Class Selection */}
      <div className="class-selection-container">
        <label htmlFor="classSelect">Select Class:</label>
        <select
          id="classSelect"
          value={selectedClassId}
          onChange={(e) => handleClassSelection(e.target.value)}
          className="class-select"
        >
          <option value="">-- Select a class --</option>
          {classes.map((classObj) => (
            <option key={classObj.id} value={classObj.id}>
              {classObj.topic} ({classObj.year}/{classObj.semester})
            </option>
          ))}
        </select>
      </div>

      {!selectedClass && (
        <div style={{
          padding: '20px',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#666',
          marginTop: '20px'
        }}>
          <h4>No Class Selected</h4>
          <p>Please select a class to view and manage evaluations.</p>
        </div>
      )}

      {selectedClass && selectedClass.enrollments.length === 0 && (
        <div style={{
          padding: '20px',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#666',
          marginTop: '20px'
        }}>
          <h4>No Students Enrolled</h4>
          <p>This class has no enrolled students yet.</p>
          <p>Add students in the Students tab first.</p>
        </div>
      )}

      {selectedClass && selectedClass.enrollments.length > 0 && (
        <div className="evaluation-table-container">
          {/*Componente de importacao de notas de uma planilha, vai reagir as mudacas do classId */}
          <div>
            <ImportGradeComponent classID={selectedClassId} />
          </div>
          <h4>{selectedClass.topic} ({selectedClass.year}/{selectedClass.semester})</h4>

          {/* View Mode Toggle */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => setViewMode('evaluations')}
              style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: viewMode === 'evaluations' ? '#667eea' : '#e2e8f0',
                color: viewMode === 'evaluations' ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem'
              }}
            >
              Evaluations
            </button>
            <button
              onClick={() => setViewMode('self-evaluations')}
              style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: viewMode === 'self-evaluations' ? '#667eea' : '#e2e8f0',
                color: viewMode === 'self-evaluations' ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem'
              }}
            >
              Self-Evaluations
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: viewMode === 'comparison' ? '#667eea' : '#e2e8f0',
                color: viewMode === 'comparison' ? 'white' : '#4a5568',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem'
              }}
            >
              Comparison
            </button>
          </div>

          {/* Evaluations View */}
          {viewMode === 'evaluations' && (
            <div className="evaluation-matrix">
              <table className="evaluation-table">
                <thead>
                  <tr>
                    <th className="student-name-header">Student</th>
                    {evaluationGoals.map(goal => (
                      <th key={goal} className="goal-header">{goal}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedClass.enrollments.map(enrollment => {
                    const student = enrollment.student;

                    // Create a map of evaluations for quick lookup
                    const studentEvaluations = enrollment.evaluations.reduce((acc, evaluation) => {
                      acc[evaluation.goal] = evaluation.grade;
                      return acc;
                    }, {} as { [goal: string]: string });

                    return (
                      <tr key={student.cpf} className="student-row">
                        <td className="student-name-cell">{student.name}</td>
                        {evaluationGoals.map(goal => {
                          const currentGrade = studentEvaluations[goal] || '';

                          return (
                            <td key={goal} className="evaluation-cell">
                              <select
                                value={currentGrade}
                                onChange={(e) => handleEvaluationChange(student.cpf, goal, e.target.value)}
                                className={`evaluation-select ${currentGrade ? `grade-${currentGrade.toLowerCase()}` : ''}`}
                              >
                                <option value="">-</option>
                                <option value="MANA">MANA</option>
                                <option value="MPA">MPA</option>
                                <option value="MA">MA</option>
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Self-Evaluations View */}
          {viewMode === 'self-evaluations' && (
            <div className="evaluation-matrix">
              <table className="evaluation-table">
                <thead>
                  <tr>
                    <th className="student-name-header">Student</th>
                    {evaluationGoals.map(goal => (
                      <th key={goal} className="goal-header">{goal}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedClass.enrollments.map(enrollment => {
                    const student = enrollment.student;

                    // Create a map of self-evaluations for quick lookup
                    const studentEvaluations = enrollment.evaluations.reduce((acc, evaluation) => {
                      acc[evaluation.goal] = evaluation.grade;
                      return acc;
                    }, {} as { [goal: string]: string });

                    const studentSelfEvaluations = enrollment.selfEvaluations.reduce((acc, evaluation) => {
                      acc[evaluation.goal] = evaluation.grade;
                      return acc;
                    }, {} as { [goal: string]: string });

                    return (
                      <tr key={student.cpf} className="student-row">
                        <td className="student-name-cell">{student.name}</td>
                        {evaluationGoals.map(goal => {
                          const currentGrade = studentSelfEvaluations[goal] || '';
                          const evaluationGrade = studentEvaluations[goal] || '';
                          const hasDiscrepancy = compareGoal(evaluationGrade, currentGrade);
                          const getGradeStyle = (grade: string) => {
                            switch (grade) {
                              case 'MA':
                                return {
                                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              case 'MPA':
                                return {
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              case 'MANA':
                                return {
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              default:
                                return {
                                  backgroundColor: 'transparent',
                                  color: '#9ca3af'
                                };
                            }
                          };

                          return (
                            <td key={goal} className="evaluation-cell">
                              {hasDiscrepancy && (
                                  <InfoButton text={"Avaliação do professor foi " + evaluationGrade} />
                                )
                              }
                              <span style={{
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                ...getGradeStyle(currentGrade)
                              }}>
                                {currentGrade || '-'}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Comparison View */}
          {viewMode === 'comparison' && (
            <div className="evaluation-matrix">
              <table className="evaluation-table" style={{ minWidth: '1000px' }}>
                <thead>
                  <tr>
                    <th className="student-name-header" style={{ width: '180px' }}>Student</th>
                    {evaluationGoals.map(goal => (
                      <th key={goal} className="goal-header" style={{ gridColumn: 'span 2' }} colSpan={2}>
                        {goal}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="goal-header" style={{ width: '180px' }}></th>
                    {evaluationGoals.map(goal => (
                      <React.Fragment key={`${goal}-header`}>
                        <th className="goal-header" style={{ width: '80px' }}>
                          Prof
                        </th>
                        <th className="goal-header" style={{ width: '80px' }}>
                          Self
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedClass.enrollments.map(enrollment => {
                    const student = enrollment.student;

                    const studentEvaluations = enrollment.evaluations.reduce((acc, evaluation) => {
                      acc[evaluation.goal] = evaluation.grade;
                      return acc;
                    }, {} as { [goal: string]: string });

                    const studentSelfEvaluations = enrollment.selfEvaluations.reduce((acc, evaluation) => {
                      acc[evaluation.goal] = evaluation.grade;
                      return acc;
                    }, {} as { [goal: string]: string });

                    const { percentage, highlight } = getStudentDiscrepancyInfo(
                      evaluationGoals,
                      studentEvaluations,
                      studentSelfEvaluations
                    );

                    return (
                      <tr key={student.cpf} className="student-row">
                        <td className="student-name-cell" style={{ width: '180px' }}>
                          {student.name}                          
                          {highlight && (
                            <InfoButton text={"Discrepância de " + percentage + "%"} />
                          )}
                        </td>
                        {evaluationGoals.map(goal => {
                          const evaluation = studentEvaluations[goal] || '';
                          const selfEvaluation = studentSelfEvaluations[goal] || '';
                          const discrepancyClass = getDiscrepancyClass(evaluation, selfEvaluation);
                          const hasDiscrepancy = compareGoal(evaluation, selfEvaluation);
                          const getGradeStyle = (grade: string) => {
                            switch (grade) {
                              case 'MA':
                                return {
                                  background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              case 'MPA':
                                return {
                                  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              case 'MANA':
                                return {
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: 'white',
                                  fontWeight: '600',
                                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                };
                              default:
                                return {
                                  backgroundColor: 'transparent',
                                  color: '#9ca3af'
                                };
                            }
                          };

                          return (
                            <React.Fragment key={`${student.cpf}-${goal}`}>
                              <td style={{
                                padding: '8px',
                                textAlign: 'center',
                                border: '1px solid #cbd5e1',
                                backgroundColor: discrepancyClass === 'discrepancy' ? '#fef3c7' : (student.cpf.charCodeAt(0) % 2 === 0 ? '#f0f9ff' : '#ffffff'),
                                width: '80px'
                              }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '600',
                                  fontSize: '0.85rem',
                                  ...getGradeStyle(evaluation)
                                }}>
                                  {evaluation || '-'}
                                </span>
                              </td>
                              <td style={{
                                padding: '8px',
                                textAlign: 'center',
                                border: '1px solid #cbd5e1',
                                backgroundColor: discrepancyClass === 'discrepancy' ? '#fef3c7' : (student.cpf.charCodeAt(0) % 2 === 0 ? '#f0f9ff' : '#ffffff'),
                                width: '80px'
                              }}>
                                {hasDiscrepancy && (
                                  <InfoButton text={"Nota Discrepante"} />
                                )}
                                <span style={{
                                  display: 'inline-block',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontWeight: '600',
                                  fontSize: '0.85rem',
                                  ...getGradeStyle(selfEvaluation)
                                }}>
                                  {selfEvaluation || '-'}
                                </span>
                              </td>
                            </React.Fragment>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Evaluations;