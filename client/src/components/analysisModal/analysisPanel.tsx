import { Class } from "../../types/Class";
import ClassService from "../../services/ClassService";
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
