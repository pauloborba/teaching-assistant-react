import React, { useState, useEffect, useCallback } from 'react';
import { Class } from '../types/Class';
import { Student } from '../types/Student';
import ClassService from '../services/ClassService';
import { studentService } from '../services/StudentService';
import EnrollmentService from '../services/EnrollmentService';

interface SelfEvaluationProps {
  onError: (errorMessage: string) => void;
}

const SelfEvaluation: React.FC<SelfEvaluationProps> = ({ onError }) => {
  const [email, setEmail] = useState<string>('');
  const [cpf, setCpf] = useState<string>('');
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [studentData, setStudentData] = useState<Student | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

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
      const classesData = await ClassService.getAllClasses();
      setClasses(classesData);
    } catch (error) {
      onError(`Failed to load classes. Please refresh the page and try again.`);
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

  // Helper function to clean CPF
  const cleanCPF = (cpf: string): string => {
    return cpf.replace(/[.-]/g, '');
  };

  const handleSearchStudent = async () => {
    if (!email.trim() || !cpf.trim()) {
      onError('Please enter both email and CPF to continue');
      return;
    }

    try {
      setIsSearching(true);
      setStudentData(null);
      setSelectedClassId('');
      setSelectedClass(null);

      const cleanedCPF = cleanCPF(cpf);
      const student = await studentService.getStudentByCPF(cleanedCPF);

      if (student.email !== email.trim()) {
        onError('The email provided does not match the CPF registered in the system. Please verify your information and try again.');
        setStudentData(null);
        return;
      }

      setStudentData(student);

      // Load fresh classes to get current enrollments
      const classesData = await ClassService.getAllClasses();
      setClasses(classesData);
    } catch (error) {
      onError(`Student not found. Please verify the CPF entered (${cpf}) and try again.`);
      setStudentData(null);
    } finally {
      setIsSearching(false);
    }
  };

  // Get classes where the student is enrolled
  const getEnrolledClasses = (): Class[] => {
    if (!studentData) return [];

    const cleanedCPF = cleanCPF(studentData.cpf);
    return classes.filter(classObj =>
      classObj.enrollments.some(enrollment => {
        const enrollmentCPF = cleanCPF(enrollment.student.cpf);
        return enrollmentCPF === cleanedCPF;
      })
    );
  };

  const handleSelfEvaluationChange = async (goal: string, grade: string) => {
    if (!selectedClass || !studentData) {
      onError('Please select a class before saving your evaluation');
      return;
    }

    try {
      await EnrollmentService.updateSelfEvaluation(selectedClass.id, studentData.cpf, goal, grade);
      // Reload classes to get updated enrollment data
      await loadClasses();
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('Invalid grade')) {
        onError('Invalid grade selection. Please choose a valid option (MANA, MPA, or MA).');
      } else if (errorMessage.includes('not enrolled')) {
        onError('You are not enrolled in this class. Please select a different class.');
      } else if (errorMessage.includes('not found')) {
        onError('Class or student not found. Please try refreshing the page.');
      } else {
        onError(`Failed to save your evaluation. Please try again. Details: ${errorMessage}`);
      }
    }
  };

  const enrolledClasses = getEnrolledClasses();

  return (
    <div className="self-evaluation-section">
      <h3>Self-Evaluation</h3>

      {/* Student Search Section */}
      <div className="search-container" style={{
        padding: '1.5rem',
        backgroundColor: '#f0f9ff',
        borderRadius: '12px',
        marginBottom: '1.5rem',
        border: '2px solid #0ea5e9',
        boxShadow: '0 2px 4px rgba(14, 165, 233, 0.1)'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label htmlFor="email-input" style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#0c4a6e',
              fontSize: '0.95rem'
            }}>Email:</label>
            <input
              id="email-input"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '2px solid #0ea5e9',
                boxSizing: 'border-box',
                fontSize: '1rem',
                fontWeight: '500',
                backgroundColor: 'white',
                transition: 'all 0.2s ease',
                color: '#0c4a6e'
              }}
              disabled={isSearching}
              onFocus={(e) => {
                e.target.style.borderColor = '#0284c7';
                e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#0ea5e9';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ flex: '1', minWidth: '200px' }}>
            <label htmlFor="cpf-input" style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '600',
              color: '#0c4a6e',
              fontSize: '0.95rem'
            }}>CPF:</label>
            <input
              id="cpf-input"
              type="text"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '2px solid #0ea5e9',
                boxSizing: 'border-box',
                fontSize: '1rem',
                fontWeight: '500',
                backgroundColor: 'white',
                transition: 'all 0.2s ease',
                color: '#0c4a6e'
              }}
              disabled={isSearching}
              onFocus={(e) => {
                e.target.style.borderColor = '#0284c7';
                e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#0ea5e9';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <button
              onClick={handleSearchStudent}
              disabled={isSearching || !email.trim() || !cpf.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: isSearching ? '#9ca3af' : '#0284c7',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isSearching ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '1rem',
                transition: 'all 0.2s ease',
                opacity: isSearching ? 0.7 : 1,
                boxShadow: !isSearching ? '0 4px 6px rgba(2, 132, 199, 0.3)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (!isSearching && email.trim() && cpf.trim()) {
                  e.currentTarget.style.backgroundColor = '#0369a1';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSearching) {
                  e.currentTarget.style.backgroundColor = '#0284c7';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Class Selection Section */}
      {studentData && enrolledClasses.length > 0 && (
        <div className="class-selection-container">
          <label htmlFor="classSelect" style={{
            display: 'block',
            marginBottom: '0.75rem',
            fontWeight: '700',
            color: '#0c4a6e',
            fontSize: '1.05rem'
          }}>Select Your Class:</label>
          <select
            id="classSelect"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="class-select"
          >
            <option value="">-- Select a class --</option>
            {enrolledClasses.map((classObj) => (
              <option key={classObj.id} value={classObj.id}>
                {classObj.topic} ({classObj.year}/{classObj.semester})
              </option>
            ))}
          </select>
        </div>
      )}

      {studentData && enrolledClasses.length === 0 && (
        <div style={{
          padding: '2rem',
          border: '2px dashed #cbd5e1',
          borderRadius: '12px',
          textAlign: 'center',
          color: '#64748b',
          marginTop: '1.5rem',
          backgroundColor: '#f8fafc'
        }}>
          <h4 style={{ color: '#475569', marginBottom: '0.5rem', fontSize: '1.1rem' }}>No Classes Available</h4>
          <p>You are not enrolled in any classes. Please contact your instructor or administrator to register.</p>
        </div>
      )}

      {selectedClass && studentData && (
        <div className="evaluation-table-container">
          <h4 style={{ color: '#2d3748', fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: '600' }}>
            {selectedClass.topic} ({selectedClass.year}/{selectedClass.semester})
          </h4>

          <div className="evaluation-matrix">
            <table className="evaluation-table">
              <thead>
                <tr>
                  <th className="student-name-header">Evaluation Goal</th>
                  <th className="goal-header">Your Self-Evaluation</th>
                </tr>
              </thead>
              <tbody>
                {evaluationGoals.map((goal, index) => {
                  // Find the enrollment for this student in the selected class
                  const cleanedStudentCPF = cleanCPF(studentData.cpf);
                  const enrollment = selectedClass.enrollments.find(
                    e => cleanCPF(e.student.cpf) === cleanedStudentCPF
                  );

                  // Get the self-evaluation for this goal
                  const selfEvaluation = enrollment?.selfEvaluations.find(
                    se => se.goal === goal
                  );
                  const currentGrade = selfEvaluation?.grade || '';

                  const getGradeStyle = (grade: string) => {
                    switch(grade) {
                      case 'MA':
                        return {
                          background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
                          color: 'white'
                        };
                      case 'MPA':
                        return {
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white'
                        };
                      case 'MANA':
                        return {
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          color: 'white'
                        };
                      default:
                        return {
                          backgroundColor: 'transparent',
                          color: '#9ca3af'
                        };
                    }
                  };

                  return (
                    <tr key={goal} className="student-row">
                      <td className="student-name-cell" style={{ width: 'auto', maxWidth: 'none' }}>
                        {goal}
                      </td>
                      <td className="evaluation-cell" style={{ width: 'auto', maxWidth: 'none', padding: '8px' }}>
                        <select
                          value={currentGrade}
                          onChange={(e) => handleSelfEvaluationChange(goal, e.target.value)}
                          style={{
                            ...getGradeStyle(currentGrade),
                            width: '100%',
                            maxWidth: '120px',
                            padding: '8px 12px',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: '600',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            textAlign: 'center',
                            textAlignLast: 'center'
                          }}
                        >
                          <option value="" style={{ backgroundColor: 'white', color: '#9ca3af' }}>-</option>
                          <option value="MANA" style={{ backgroundColor: '#fecaca', color: '#991b1b' }}>MANA</option>
                          <option value="MPA" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>MPA</option>
                          <option value="MA" style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>MA</option>
                        </select>
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
  );
};

export default SelfEvaluation;
