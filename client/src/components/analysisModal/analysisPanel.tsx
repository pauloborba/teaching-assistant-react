import React, { useEffect, useState, useMemo } from "react";
import ClassService from "../../services/ClassService";
import { Class } from "../../types/Class";
// 1. Importar o novo componente de gráfico
import { ClassFailureChart, ChartData } from "./classFailuresChart";

// --- Helpers para a nova lógica ---
type SemesterInfo = {
  year: number;
  semester: number;
};

// Função helper para comparar se s1 é anterior a s2
const isSemesterPrior = (s1: SemesterInfo, s2: SemesterInfo): boolean => {
  if (s1.year < s2.year) return true;
  if (s1.year === s2.year && s1.semester < s2.semester) return true;
  return false;
};
// ----------------------------------


const AnalysisPanel: React.FC<{ classTopic: string; onClose: () => void }> = ({
  classTopic,
  onClose,
}) => {
  const [classData, setClassData] = useState<Class[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  // 2. Lógica de processamento atualizada no useMemo
  const chartData = useMemo<ChartData[]>(() => {
    if (!classData || classData.length === 0) {
      return [];
    }

    // Passo 1: Mapear o histórico completo de CADA aluno (usando CPF)
    const studentHistory = new Map<string, SemesterInfo[]>();
    classData.forEach((classInfo) => {
      classInfo.enrollments.forEach((enrollment) => {
        const cpf = enrollment.student.cpf;
        const semester = { year: classInfo.year, semester: classInfo.semester };

        const history = studentHistory.get(cpf) || [];
        // Adiciona o semestre atual ao histórico do aluno
        studentHistory.set(cpf, [...history, semester]);
      });
    });

    // Passo 2: Calcular as re-matrículas (reprovações) para cada turma
    const dataForChart = classData.map((classInfo) => {
      const currentSemester = { year: classInfo.year, semester: classInfo.semester };
      let failureCount = 0; // Contador de re-matrículas para ESTA turma

      classInfo.enrollments.forEach((enrollment) => {
        const cpf = enrollment.student.cpf;
        const history = studentHistory.get(cpf) || [];

        // Verifica se o aluno tem *qualquer* matrícula em um semestre *anterior*
        const hasPriorEnrollment = history.some((priorSemester) =>
          isSemesterPrior(priorSemester, currentSemester)
        );

        if (hasPriorEnrollment) {
          failureCount++;
        }
      });

      // Formata o label para o gráfico
      const chartLabel = `${classInfo.year}-${classInfo.semester}`;
      return {
        name: chartLabel, // Ex: "2025-1"
        failures: failureCount,
      };
    });

    // Opcional: Ordenar os dados para o gráfico ficar em ordem cronológica
    return dataForChart.sort((a, b) => a.name.localeCompare(b.name));

  }, [classData]);

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
            <div className="flex flex-row p-4">
              {loading ? (
                <p>Loading class data...</p>
              ) : chartData.length > 0 ? (
                // Renderiza o componente de gráfico separado!
                <ClassFailureChart data={chartData} />
              ) : (
                <p>No data found for this class.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AnalysisPanel;
