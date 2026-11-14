import React, { useState, useEffect, useCallback } from 'react';
import { Student } from './types/Student';
import { Class } from './types/Class';
import { studentService } from './services/StudentService';
import { classService } from './services/ClassService';
import StudentsTab from './components/StudentsTab';
import Evaluations from './components/Evaluations';
import Classes from './components/Classes';
import SelfAssessment from './components/SelfAssessment';
import './App.css';

type TabType = 'students' | 'evaluations' | 'classes' | 'self-assessment';

const TABS: { type: TabType; label: string }[] = [
  { type: 'students', label: 'Students' },
  { type: 'evaluations', label: 'Evaluations' },
  { type: 'classes', label: 'Classes' },
  { type: 'self-assessment', label: 'My self-assessment' }
];

/**
 * The application: keeps the students and classes shown by the tabs in sync
 * with the server, and shows the errors reported by them.
 */
const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('students');

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      setStudents(await studentService.getAllStudents());
    } catch (err) {
      setError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadClasses = useCallback(async (): Promise<Class[]> => {
    try {
      setError('');
      const classesData = await classService.getAllClasses();
      setClasses(classesData);
      // Keeps the selected class in sync with its new enrollments
      setSelectedClass(previous => (previous ? classesData.find(c => c.id === previous.id) || previous : null));
      return classesData;
    } catch (err) {
      setError('Failed to load classes. Please try again.');
      return [];
    }
  }, []);

  // Load students and classes on component mount
  useEffect(() => {
    loadStudents();
    loadClasses();
  }, [loadStudents, loadClasses]);

  // A student was added or deleted: both the list and the enrollments changed
  const handleStudentSetChanged = () => {
    loadStudents();
    loadClasses();
  };

  const handleStudentUpdated = () => {
    setEditingStudent(null);
    loadStudents();
  };

  const handleClassDeleted = () => {
    loadClasses();
    setSelectedClass(null); // Clear selection if deleted class was selected
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
          </div>
        )}

        {/* Tab Navigation */}
        <div className="tab-navigation">
          {TABS.map(({ type, label }) => (
            <button
              key={type}
              className={`tab-button ${activeTab === type ? 'active' : ''}`}
              onClick={() => setActiveTab(type)}
              data-testid={`${type}-tab`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'students' && (
            <StudentsTab
              students={students}
              classes={classes}
              selectedClass={selectedClass}
              onSelectClass={setSelectedClass}
              editingStudent={editingStudent}
              onEditStudent={setEditingStudent}
              onCancelEdit={() => setEditingStudent(null)}
              onStudentAdded={handleStudentSetChanged}
              onStudentUpdated={handleStudentUpdated}
              onStudentDeleted={handleStudentSetChanged}
              onError={setError}
              loading={loading}
            />
          )}

          {activeTab === 'evaluations' && (
            <Evaluations
              onError={setError}
            />
          )}

          {activeTab === 'classes' && (
            <Classes
              classes={classes}
              onClassAdded={loadClasses}
              onClassUpdated={loadClasses}
              onClassDeleted={handleClassDeleted}
              onError={setError}
            />
          )}

          {activeTab === 'self-assessment' && <SelfAssessment />}
        </div>
      </main>
    </div>
  );
};

export default App;
