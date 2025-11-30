import { Class } from "../../types/Class";
import ClassService from "../../services/ClassService";
import ClassSumary from "./classSumary";
import React, { useEffect, useState, useMemo } from "react";
import { ClassFailureChart, ChartData } from "./classFailuresChart";

type SemesterInfo = {
  year: number;
  semester: number;
};

const isSemesterPrior = (s1: SemesterInfo, s2: SemesterInfo): boolean => {
  if (s1.year < s2.year) return true;
  if (s1.year === s2.year && s1.semester < s2.semester) return true;
  return false;
};

type ViewMode = 'failures' | 'performance';

const AnalysisPanel: React.FC<{ classTopic: string; onClose: () => void }> = ({
  classTopic,
  onClose,
}) => {
  const [classData, setClassData] = useState<Class[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('failures');

  // Estados para o modo "Reprovações"
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  // Estados para o modo "Análise de Desempenho"
  const [selectedPeriods, setSelectedPeriods] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchClassData = async () => {
      try {
        setLoading(true);
        const data = await ClassService.getClassByTopic(classTopic);
        setClassData(data);
        console.log("Fetched class data:", data);
      } catch (error) {
        console.error("Error fetching class data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (classTopic) {
      fetchClassData();
    }
  }, [classTopic]);

  const chartData = useMemo<ChartData[]>(() => {
    if (!classData || classData.length === 0) {
      return [];
    }

    // Mapear cada aluno e contar em quantas turmas ele aparece
    const studentEnrollmentCount = new Map<string, { name: string; count: number }>();

    classData.forEach((classInfo) => {
      classInfo.enrollments.forEach((enrollment) => {
        const cpf = enrollment.student.cpf;
        const studentName = enrollment.student.name;

        if (studentEnrollmentCount.has(cpf)) {
          // Aluno já visto - incrementa o contador
          const current = studentEnrollmentCount.get(cpf)!;
          current.count += 1;
        } else {
          // Primeira vez que vemos este aluno
          studentEnrollmentCount.set(cpf, { name: studentName, count: 1 });
        }
      });
    });

    const dataForChart: ChartData[] = [];

    studentEnrollmentCount.forEach((value, cpf) => {
      const failures = value.count - 1;

      if (failures > 0) {
        dataForChart.push({
          name: value.name,
          failures: failures,
        });
      }
    });
    return dataForChart.sort((a, b) => b.failures - a.failures);

  }, [classData]);

  // Filtrar dados do gráfico baseado nos alunos selecionados
  const filteredChartData = useMemo(() => {
    if (selectedStudents.size === 0) {
      return chartData; // Se nenhum aluno selecionado, mostra todos
    }
    return chartData.filter(item => selectedStudents.has(item.name));
  }, [chartData, selectedStudents]);

  // Função para alternar expansão de turma
  const toggleClassExpansion = (classId: string) => {
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(classId)) {
      newExpanded.delete(classId);
    } else {
      newExpanded.add(classId);
    }
    setExpandedClasses(newExpanded);
  };

  // Função para alternar seleção de aluno
  const toggleStudentSelection = (studentName: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentName)) {
      newSelected.delete(studentName);
    } else {
      newSelected.add(studentName);
    }
    setSelectedStudents(newSelected);
  };

  // Função para selecionar todos os alunos de uma turma
  const selectAllFromClass = (classInfo: Class) => {
    const newSelected = new Set(selectedStudents);
    classInfo.enrollments.forEach(enrollment => {
      newSelected.add(enrollment.student.name);
    });
    setSelectedStudents(newSelected);
  };

  // Função para desselecionar todos os alunos de uma turma
  const deselectAllFromClass = (classInfo: Class) => {
    const newSelected = new Set(selectedStudents);
    classInfo.enrollments.forEach(enrollment => {
      newSelected.delete(enrollment.student.name);
    });
    setSelectedStudents(newSelected);
  };

  // Função para limpar todas as seleções
  const clearAllSelections = () => {
    setSelectedStudents(new Set());
  };

  // Funções para o modo "Análise de Desempenho"
  const availablePeriods = useMemo(() => {
    if (!classData || classData.length === 0) return [];
    
    const periods = classData.map(c => ({
      id: `${c.year}.${c.semester}`,
      year: c.year,
      semester: c.semester,
      studentsCount: c.enrollments.length
    }));
    
    // Ordenar por ano e semestre
    return periods.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.semester - b.semester;
    });
  }, [classData]);

  const togglePeriodSelection = (periodId: string) => {
    const newSelected = new Set(selectedPeriods);
    if (newSelected.has(periodId)) {
      newSelected.delete(periodId);
    } else {
      newSelected.add(periodId);
    }
    setSelectedPeriods(newSelected);
  };

  const selectAllPeriods = () => {
    setSelectedPeriods(new Set(availablePeriods.map(p => p.id)));
  };

  const clearAllPeriods = () => {
    setSelectedPeriods(new Set());
  };

  // Filtrar dados de classe baseado nos períodos selecionados
  const filteredClassData = useMemo(() => {
    if (!classData || selectedPeriods.size === 0) {
      return classData; // Se nenhum período selecionado, mostra todos
    }
    return classData.filter(c => {
      const periodId = `${c.year}.${c.semester}`;
      return selectedPeriods.has(periodId);
    });
  }, [classData, selectedPeriods]);

  return (
    <>
      {classTopic && (
        <div className='enrollment-overlay'>
          <div className='enrollment-modal'>
            <div className='enrollment-modal-header'>
              <h2>Analysis for {classTopic}</h2>
              <button
                className="close-modal-btn"
                onClick={onClose}
                title="Close"
              >
                ×
              </button>
            </div>
            {/* 3. Área de renderização atualizada */}
            <div style={{
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "row",
            }}>
              <div style={{
                width: "30%",
                backgroundColor: '#f9fafb',
                padding: '1rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                maxHeight: '600px',
                overflowY: 'auto'
               }}>
                {/* Botões de seleção de modo */}
                <button
                  className="enroll-btn"
                  onClick={() => setViewMode('failures')}
                  style={{
                    marginBottom: '0.5rem',
                    backgroundColor: viewMode === 'failures' ? '#3b82f6' : '#cbd5e0',
                    fontWeight: viewMode === 'failures' ? '600' : '400'
                  }}
                >
                  Reprovações por Aluno
                </button>
                <button
                  className="enroll-btn"
                  onClick={() => setViewMode('performance')}
                  style={{
                    marginBottom: '1rem',
                    backgroundColor: viewMode === 'performance' ? '#3b82f6' : '#cbd5e0',
                    fontWeight: viewMode === 'performance' ? '600' : '400'
                  }}
                >
                  Análise de Desempenho
                </button>

                {/* Conteúdo do sidebar baseado no modo */}
                {viewMode === 'failures' ? (
                  <>
                    {/* Controles de seleção - Modo Reprovações */}
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                    }}>
                      <button
                        onClick={clearAllSelections}
                        style={{
                          padding: '0.4rem 0.8rem',
                          fontSize: '0.75rem',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        Limpar Seleção
                      </button>
                    </div>

                    <div style={{
                      fontSize: '0.875rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem',
                      fontWeight: '500'
                    }}>
                      {selectedStudents.size > 0
                        ? `${selectedStudents.size} aluno(s) selecionado(s)`
                        : 'Selecione alunos para filtrar'}
                    </div>

                    {/* Lista de turmas - Modo Reprovações */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>
                    Turmas e Alunos:
                  </h4>
                  {classData && classData.length > 0 ? (
                    classData.map((classInfo) => {
                      const classId = `${classInfo.year}-${classInfo.semester}`;
                      const isExpanded = expandedClasses.has(classId);

                      return (
                        <div
                          key={classId}
                          style={{
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            backgroundColor: 'white'
                          }}
                        >
                          {/* Cabeçalho da turma */}
                          <div
                            onClick={() => toggleClassExpansion(classId)}
                            style={{
                              padding: '0.75rem',
                              backgroundColor: '#e0f2fe',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontWeight: '600',
                              fontSize: '0.85rem',
                              color: '#0c4a6e'
                            }}
                          >
                            <span>{classId} ({classInfo.enrollments.length} alunos)</span>
                            <span>{isExpanded ? '▼' : '▶'}</span>
                          </div>

                          {/* Lista de alunos */}
                          {isExpanded && (
                            <div style={{ padding: '0.5rem' }}>
                              <div style={{
                                display: 'flex',
                                gap: '0.25rem',
                                marginBottom: '0.5rem'
                              }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectAllFromClass(classInfo);
                                  }}
                                  style={{
                                    padding: '0.25rem 0.5rem',
                                    fontSize: '0.7rem',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    flex: 1,
                                    minWidth: 0
                                  }}
                                >
                                  Todos
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deselectAllFromClass(classInfo);
                                  }}
                                  style={{
                                    padding: '0.25rem 0.4rem',
                                    fontSize: '0.65rem',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    flex: 1,
                                    minWidth: 0
                                  }}
                                >
                                  Nenhum
                                </button>
                              </div>

                              {classInfo.enrollments.map((enrollment) => {
                                const isSelected = selectedStudents.has(enrollment.student.name);
                                return (
                                  <div
                                    key={enrollment.student.cpf}
                                    onClick={() => toggleStudentSelection(enrollment.student.name)}
                                    style={{
                                      padding: '0.5rem',
                                      margin: '0.25rem 0',
                                      backgroundColor: isSelected ? '#dcfce7' : '#f9fafb',
                                      border: `1px solid ${isSelected ? '#10b981' : '#e5e7eb'}`,
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      transition: 'all 0.2s'
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      style={{ accentColor: '#10b981' }}
                                    />
                                    <span style={{
                                      color: isSelected ? '#065f46' : '#374151',
                                      fontWeight: isSelected ? '500' : '400'
                                    }}>
                                      {enrollment.student.name}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      Nenhuma turma disponível
                    </p>
                  )}
                </div>
                  </>
                ) : (
                  <>
                    {/* Sidebar do modo "Análise de Desempenho" */}
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>

                      {/* Controles de seleção */}
                      <div style={{
                        display: 'flex',
                        gap: '0.1rem',
                        marginBottom: '0.2rem',
                      }}>
                        <button
                          onClick={selectAllPeriods}
                          style={{
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            flex: 1,
                            fontWeight: '500'
                          }}
                        >
                          Selecionar Todos
                        </button>
                        <button
                          onClick={clearAllPeriods}
                          style={{
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            flex: 1,
                            fontWeight: '500'
                          }}
                        >
                          Limpar
                        </button>
                      </div>

                      {/* Contador de seleção */}
                      <div style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        marginBottom: '0.5rem',
                        fontWeight: '500'
                      }}>
                        {selectedPeriods.size > 0
                          ? `${selectedPeriods.size} Turma(s) selecionado(s)`
                          : 'Selecione turmas para filtrar'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>
                          Turmas:
                        </h4>
                        {/* Lista de períodos */}
                        {availablePeriods.length > 0 ? (
                          availablePeriods.map((period) => {
                            const isSelected = selectedPeriods.has(period.id);
                            return (
                              <div
                                key={period.id}
                                style={{
                                  border: '1px solid #d1d5db',
                                  borderRadius: '6px',
                                  overflow: 'hidden',
                                  backgroundColor: 'white'
                                }}
                              >
                                <div
                                  onClick={() => togglePeriodSelection(period.id)}
                                  style={{
                                    padding: '0.75rem',
                                    backgroundColor: '#e0f2fe',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    color: '#0c4a6e'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {}}
                                      style={{ accentColor: '#3b82f6' }}
                                    />
                                    <span>
                                      {period.id} ({period.studentsCount} aluno{period.studentsCount !== 1 ? 's' : ''})
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'center' }}>
                            Nenhum período disponível
                          </p>
                        )}
                      </div>

                    </div>
                  </>
                )}
               </div>

              {/* Área do gráfico */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {loading ? (
                  <p>Loading class data...</p>
                ) : viewMode === 'failures' ? (
                  // Modo: Reprovações por Aluno
                  filteredChartData.length > 0 ? (
                    <ClassFailureChart data={filteredChartData} />
                  ) : (
                    <p>No data found for this class.</p>
                  )
                ) : (
                  // Modo: Análise de Desempenho
                  classData && classData.length > 0 ? (
                    <ClassSumary 
                      data={filteredClassData} 
                      discipline={classTopic}
                      selectedPeriodsCount={selectedPeriods.size}
                      totalPeriodsCount={availablePeriods.length}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#6b7280'
                    }}>
                      <p>No data found for this class.</p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AnalysisPanel;