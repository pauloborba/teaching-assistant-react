import React, { useState, useEffect, useCallback } from 'react';
import { Student } from './types/Student';
import { Class } from './types/Class';
import { studentService } from './services/StudentService';
import ClassService from './services/ClassService';
import StudentList from './components/StudentList';
import StudentForm from './components/StudentForm';
import Evaluations from './components/Evaluations';
import Classes from './components/Classes';
import './App.css';
import StudentStatusService from './services/StudentStatusColorService';
import { StudentStatus } from './types/StudentStatusColor';

type TabType = 'students' | 'evaluations' | 'classes';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('students');
  const [studentsStatus, setStudentsStatus] = useState<StudentStatus[]>([]);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const studentsData = await studentService.getAllStudents();
      setStudents(studentsData);
    } catch (err) {
      setError('Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const classesData = await ClassService.getAllClasses();
      setClasses(classesData);
      return classesData;
    } catch (err) {
      setError('Failed to load classes.');
      return [];
    }
  }, []);

  const loadStudentStatus = useCallback(async (classId: string) => {
    try {
      const statusData = await StudentStatusService.getStudentsStatusByClass(classId);
      setStudentsStatus(statusData);
    } catch (err) {
      console.error('Failed to load student status');
    }
  }, []);

  useEffect(() => {
    loadStudents();
    loadClasses();
  }, [loadStudents, loadClasses]);

  useEffect(() => {
    if (selectedClass) {
      loadStudentStatus(selectedClass.id);
    } else {
      setStudentsStatus([]);
    }
  }, [selectedClass, loadStudentStatus]);


  const handleStudentAdded = async () => {
    await loadStudents();
    const updatedClasses = await loadClasses();
    if (selectedClass) {
      const updated = updatedClasses.find(c => c.id === selectedClass.id);
      setSelectedClass(updated || null);
    }
  };

  const handleStudentDeleted = handleStudentAdded;

  const handleStudentUpdated = () => {
    setEditingStudent(null);
    loadStudents();
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
        {error && <div className="error-message"><strong>Error:</strong> {error}</div>}

        <div className="tab-navigation">
          <button className={`tab-button ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
            Students
          </button>
          <button className={`tab-button ${activeTab === 'evaluations' ? 'active' : ''}`} onClick={() => setActiveTab('evaluations')}>
            Evaluations
          </button>
          <button className={`tab-button ${activeTab === 'classes' ? 'active' : ''}`} onClick={() => setActiveTab('classes')}>
            Classes
          </button>
        </div>

        <div className="tab-content">
          {activeTab === 'students' && (
            <>
              <div className="class-selection">
                <label htmlFor="class-select">Filter by Class:</label>
                <select
                  id="class-select"
                  value={selectedClass ? selectedClass.id : ''}
                  onChange={(e) => {
                    const classId = e.target.value;
                    const classObj = classes.find(c => c.id === classId);
                    setSelectedClass(classObj || null);
                  }}
                  className="class-selector"
                >
                  <option value="">All Students</option>
                  {classes.map((classObj) => (
                    <option key={classObj.id} value={classObj.id}>
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
                studentsStatus={studentsStatus}
                onStudentDeleted={handleStudentDeleted}
                onEditStudent={handleEditClick}
                onError={handleError}
                loading={loading}
              />
            </>
          )}

          {activeTab === 'evaluations' && <Evaluations onError={handleError} />}

          {activeTab === 'classes' && (
            <Classes
              classes={classes}
              onClassAdded={loadClasses}
              onClassUpdated={loadClasses}
              onClassDeleted={loadClasses}
              onError={handleError}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;