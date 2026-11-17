import React, { useState, useEffect, useCallback } from 'react';
import { Class } from '../types/Class';
import { EVALUATION_GOALS, GRADES } from '../types/Evaluation';
import { classService } from '../services/ClassService';
import { enrollmentService } from '../services/EnrollmentService';

import { ImportGradeComponent } from './ImportGrade';
import DiscrepancyPanel from './DiscrepancyPanel';

interface EvaluationsProps {
  onError: (errorMessage: string) => void;
}

const Evaluations: React.FC<EvaluationsProps> = ({ onError }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    // Load previously selected class from localStorage
    return localStorage.getItem('evaluations-selected-class') || '';
  });
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // How many times the classes were loaded: each time, the grades may have changed
  const [loadCount, setLoadCount] = useState(0);

  const loadClasses = useCallback(async () => {
    try {
      setIsLoading(true);
      const classesData = await classService.getAllClasses();
      setClasses(classesData);
      setLoadCount(count => count + 1);
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
      await enrollmentService.updateEvaluation(selectedClass.id, studentCPF, goal, grade);
      // Reload classes to get updated enrollment data
      await loadClasses();
    } catch (error) {
      onError(`Failed to update evaluation: ${(error as Error).message}`);
    }
  };

  // Only the first load replaces the page: loading again after a grade changes must not unmount what it shows
  if (isLoading && classes.length === 0) {
    return (
      <div className="evaluation-section">
        <h3>Evaluations</h3>
        <div className="evaluation-loading">
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
          data-testid="evaluations-class-select"
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
        <div className="evaluation-placeholder">
          <h4>No Class Selected</h4>
          <p>Please select a class to view and manage evaluations.</p>
        </div>
      )}

      {selectedClass && selectedClass.enrollments.length === 0 && (
        <div className="evaluation-placeholder">
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

          {/* The discrepancies depend on the grades: they are asked again whenever the classes are loaded again */}
          <DiscrepancyPanel classId={selectedClass.id} refreshKey={loadCount} />

          <div className="evaluation-matrix" data-testid="evaluation-matrix">
            <table className="evaluation-table">
              <thead>
                <tr>
                  <th className="student-name-header">Student</th>
                  {EVALUATION_GOALS.map(goal => (
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
                  }, {} as {[goal: string]: string});
                  // The self-assessment the student submitted (absent from older data)
                  const selfAssessment = Object.fromEntries(
                    (enrollment.selfAssessments ?? []).map(evaluation => [evaluation.goal, evaluation.grade])
                  );

                  return (
                    <React.Fragment key={student.cpf}>
                    <tr className="student-row" data-testid={`evaluation-row-${student.cpf}`}>
                      <td className="student-name-cell">{student.name}</td>
                      {EVALUATION_GOALS.map(goal => {
                        const currentGrade = studentEvaluations[goal] || '';
                        
                        return (
                          <td key={goal} className="evaluation-cell">
                            <select
                              data-testid={`evaluation-grade-${goal}`}
                              value={currentGrade}
                              onChange={(e) => handleEvaluationChange(student.cpf, goal, e.target.value)}
                              className={`evaluation-select ${currentGrade ? `grade-${currentGrade.toLowerCase()}` : ''}`}
                            >
                              <option value="">-</option>
                              {GRADES.map(grade => (
                                <option key={grade} value={grade}>{grade}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="self-assessment-row" data-testid={`self-assessment-row-${student.cpf}`}>
                      <td className="self-assessment-label">Self-assessment</td>
                      {EVALUATION_GOALS.map(goal => (
                        <td key={goal} className="evaluation-cell" data-testid={`self-assessment-${goal}`}>
                          {selfAssessment[goal] ?? '-'}
                        </td>
                      ))}
                    </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Evaluations;