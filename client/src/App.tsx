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

// ---- FLASHCARDS ----
import FlashcardForm from "./components/FlashcardForm";
import FlashcardList from "./components/FlashcardList";
import { FlashcardService } from "./services/FlashcardService";
const flashcardService = new FlashcardService();
// ---------------------

type TabType = 'students' | 'evaluations' | 'classes' | 'flashcards';

const App: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('students');

  // FLASHCARDS STATE
  const [flashcards, setFlashcards] = useState([]);

  const loadFlashcards = async () => {
    const data = await flashcardService.getAll();
    setFlashcards(data);
  };

  const addFlashcard = async (front: string, back: string) => {
    await flashcardService.add(front, back);
    loadFlashcards();
  };

  const deleteFlashcard = async (id: number) => {
    await flashcardService.delete(id);
    loadFlashcards();
  };

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

  useEffect(() => {
    loadStudents();
    loadClasses();
    loadFlashcards(); // << carregar flashcards ao iniciar
  }, [loadStudents, loadClasses]);

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

        {}
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

          {}
          <button className={`tab-button ${activeTab === 'flashcards' ? 'active' : ''}`} onClick={() => setActiveTab('flashcards')}>
            Flashcards
          </button>
        </div>

        {}
        <div className="tab-content">

          {activeTab === 'students' && (
            <>
              {}
            </>
          )}

          {activeTab === 'evaluations' && <Evaluations onError={setError} />}

          {activeTab === 'classes' && (
            <Classes
              classes={classes}
              onClassAdded={loadClasses}
              onClassUpdated={loadClasses}
              onClassDeleted={loadClasses}
              onError={setError}
            />
          )}

          {activeTab === 'flashcards' && (
            <div className="flashcards-section">
              <div className="section-header">
                <h2>📚 Meus Flashcards</h2>
                <p>Aprenda e memorize com flashcards interativos</p>
              </div>

              <FlashcardForm onAdd={addFlashcard} />

              <FlashcardList flashcards={flashcards} onDelete={deleteFlashcard} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
};

export default App;
