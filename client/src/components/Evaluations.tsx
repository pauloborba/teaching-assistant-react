import React, { useState, useEffect, useCallback } from 'react';
import { Class } from '../types/Class';
import ClassService from '../services/ClassService';
import EnrollmentService from '../services/EnrollmentService';

import { ImportGradeComponent } from './ImportGrade';

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
            <ImportGradeComponent classID={selectedClassId} toReset={loadClasses} />
          </div>
          <h4>{selectedClass.topic} ({selectedClass.year}/{selectedClass.semester})</h4>
          
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
                  }, {} as {[goal: string]: string});

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
        </div>
      )}
    </div>
  );
};

export default Evaluations;