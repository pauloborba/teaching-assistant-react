import React, { useState, useEffect, useCallback } from 'react';
import { Student } from './types/Student';
import { Class } from './types/Class';
import { studentService } from './services/StudentService';
import ClassService from './services/ClassService';
import StudentList from './components/StudentList';
import StudentForm from './components/StudentForm';
import Evaluations from './components/Evaluations';
import Classes from './components/Classes';
import SelfEvaluation from './components/SelfEvaluation';
import './App.css';

type TabType = 'students' | 'evaluations' | 'classes' | 'self-evaluation';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const errorTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const studentsData = await studentService.getAllStudents();
      setStudents(studentsData);
    } catch (err) {
      setError('Failed to load students. Please try again.');
      console.error('Error loading students:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      setError('');
      const classesData = await ClassService.getAllClasses();
      setClasses(classesData);
      return classesData;
    } catch (err) {
      setError('Failed to load classes. Please try again.');
      console.error('Error loading classes:', err);
      return [];
    }
  }, []);

  const updateSelectedClass = useCallback((classesData: Class[]) => {
    // Update selectedClass if it exists to reflect new enrollments
    if (selectedClass) {
      const updatedSelectedClass = classesData.find(c => 
        c.topic === selectedClass.topic && 
        c.year === selectedClass.year && 
        c.semester === selectedClass.semester
      );
      if (updatedSelectedClass) {
        setSelectedClass(updatedSelectedClass);
      }
    }
  }, [selectedClass]);

  // Load students and classes on component mount
  useEffect(() => {
    loadStudents();
    loadClasses();
  }, [loadStudents, loadClasses]);

  // Clear error message when window loses focus or after 6 seconds
  useEffect(() => {
    const handleWindowBlur = () => {
      setError('');
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };

    window.addEventListener('blur', handleWindowBlur);
    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  // Auto-clear error message after 6 seconds
  useEffect(() => {
    if (error) {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      errorTimeoutRef.current = setTimeout(() => {
        setError('');
      }, 6000);
    }

    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [error]);

  const handleStudentAdded = async () => {
    loadStudents(); // Reload the list when a new student is added
    const updatedClasses = await loadClasses(); // Also reload classes to update enrollment info
    updateSelectedClass(updatedClasses); // Update selected class with new data
  };

  const handleStudentDeleted = async () => {
    loadStudents(); // Reload the list when a student is deleted
    const updatedClasses = await loadClasses(); // Also reload classes to update enrollment info
    updateSelectedClass(updatedClasses); // Update selected class with new data
  };

  const handleStudentUpdated = () => {
    setEditingStudent(null);
    loadStudents(); // Reload the list when a student is updated
  };

  const handleClassAdded = () => {
    loadClasses(); // Reload classes when a new class is added
  };

  const handleClassUpdated = () => {
    loadClasses(); // Reload classes when a class is updated
  };

  const handleClassDeleted = () => {
    loadClasses(); // Reload classes when a class is deleted
    setSelectedClass(null); // Clear selection if deleted class was selected
  };

  const handleEditClick = (student: Student) => {
    setEditingStudent(student);
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Teaching Assistant React</h1>
        <p>Managing ESS student information</p>
      </header>

      <main className="App-main">
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
            <button 
              onClick={() => {
                setError('');
                if (errorTimeoutRef.current) {
                  clearTimeout(errorTimeoutRef.current);
                }
              }}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#c53030',
                cursor: 'pointer',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                padding: '0 0.5rem'
              }}
              title="Close error message"
            >
              ×
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-button ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => setActiveTab('students')}
            data-testid="students-tab"
          >
            Students
          </button>
          <button
            className={`tab-button ${activeTab === 'evaluations' ? 'active' : ''}`}
            onClick={() => setActiveTab('evaluations')}
            data-testid="evaluations-tab"
          >
            Evaluations
          </button>
          <button
            className={`tab-button ${activeTab === 'self-evaluation' ? 'active' : ''}`}
            onClick={() => setActiveTab('self-evaluation')}
          >
            Self-Evaluation
          </button>
          <button
            className={`tab-button ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
            data-testid="classes-tab"
          >
            Classes
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'students' && (
            <>
              {/* Class Selection */}
              <div className="class-selection">
                <label htmlFor="class-select">Filter by Class:</label>
                <select
                  id="class-select"
                  value={selectedClass ? `${selectedClass.topic}-${selectedClass.year}-${selectedClass.semester}` : ''}
                  onChange={(e) => {
                    const classId = e.target.value;
                    if (classId) {
                      const classObj = classes.find(c => `${c.topic}-${c.year}-${c.semester}` === classId);
                      setSelectedClass(classObj || null);
                    } else {
                      setSelectedClass(null);
                    }
                  }}
                  className="class-selector"
                >
                  <option value="">All Students</option>
                  {classes.map((classObj) => (
                    <option 
                      key={`${classObj.topic}-${classObj.year}-${classObj.semester}`}
                      value={`${classObj.topic}-${classObj.year}-${classObj.semester}`}
                    >
                      {classObj.topic} ({classObj.year}/{classObj.semester})
                    </option>
                  ))}
                </select>
              </div>

              <StudentForm
                onStudentAdded={handleStudentAdded}
                onStudentUpdated={handleStudentUpdated}
                onError={handleError}
                onCancel={editingStudent ? handleCancelEdit : undefined}
                editingStudent={editingStudent}
                selectedClass={selectedClass}
              />

              <StudentList
                students={selectedClass ? selectedClass.enrollments.map(e => e.student) : students}
                onStudentDeleted={handleStudentDeleted}
                onEditStudent={handleEditClick}
                onError={handleError}
                loading={loading}
              />
            </>
          )}

          {activeTab === 'evaluations' && (
            <Evaluations 
              onError={handleError}
            />
          )}

          {activeTab === 'classes' && (
            <Classes
              classes={classes}
              onClassAdded={handleClassAdded}
              onClassUpdated={handleClassUpdated}
              onClassDeleted={handleClassDeleted}
              onError={handleError}
            />
          )}

          {activeTab === 'self-evaluation' && (
            <SelfEvaluation 
              onError={handleError}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;