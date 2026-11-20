import React, { useState, useEffect, useCallback } from 'react';
import { Class, CreateClassRequest, getClassId } from '../types/Class';
import { Student } from '../types/Student';
import ClassService from '../services/ClassService';
import { studentService } from '../services/StudentService';
import EnrollmentService from '../services/EnrollmentService';
import ReminderSettings from './ReminderSettings';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA, EspecificacaoDoCalculoDaMedia } from '../types/EspecificacaoDoCalculoDaMedia';

interface ClassesProps {
  classes: Class[];
  onClassAdded: () => void;
  onClassUpdated: () => void;
  onClassDeleted: () => void;
  onError: (errorMessage: string) => void;
}

const Classes: React.FC<ClassesProps> = ({ 
  classes, 
  onClassAdded, 
  onClassUpdated, 
  onClassDeleted, 
  onError 
}) => {
  const [formData, setFormData] = useState<CreateClassRequest>({
    topic: '',
    semester: 1,
    year: new Date().getFullYear(),
    especificacaoDoCalculoDaMedia: DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA
  });
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [reminderClass, setReminderClass] = useState<Class | null>(null); // Guarda a turma selecionada; setReminderClass atualiza a seleção; null mantém a listagem visível.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classesEmail, setClassesEmail] = useState(''); // Valor que aparece no campo.
  const [savedClassesEmail, setSavedClassesEmail] = useState<string | null>(null);
  const [isEditingClassesEmail, setIsEditingClassesEmail] = useState(false);

  const showSavedClassesEmail = savedClassesEmail !== null && !isEditingClassesEmail;
  const [isLoadingClassesEmail, setIsLoadingClassesEmail] = useState(true);
  const [isSavingClassesEmail, setIsSavingClassesEmail] = useState(false);
  const [classesEmailFeedback, setClassesEmailFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null); // Mostra a confirmação ou a falha ao lado do campo.
  
  // Student enrollment state
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrollmentPanelClass, setEnrollmentPanelClass] = useState<Class | null>(null);
  const [selectedStudentsForEnrollment, setSelectedStudentsForEnrollment] = useState<Set<string>>(new Set());
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Load all students for enrollment dropdown
  const loadAllStudents = useCallback(async () => {
    try {
      const students = await studentService.getAllStudents();
      setAllStudents(students);
    } catch (error) {
      onError('Failed to load students for enrollment');
    }
  }, [onError]);

  useEffect(() => {
    loadAllStudents();
  }, [loadAllStudents]);

  const loadClassesEmail = useCallback(() => {
    let active = true; // Cada chamada acompanha a própria consulta.

    ClassService.getClassesEmail()
      .then(email => {
        if (active) {
          setSavedClassesEmail(email); // Guarda o endereço que a API devolveu.
          setClassesEmail(email ?? ''); // Preenche o formulário quando ele for aberto.
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setClassesEmailFeedback({
            type: 'error',
            message: error instanceof Error ? error.message : 'Não foi possível consultar o e-mail das turmas'
          });
        }
      })
      .finally(() => {
        if (active) setIsLoadingClassesEmail(false); // Libera o campo ao terminar a consulta.
      });

    return () => { active = false; }; // Descarta respostas que chegarem depois de sair da aba.
  }, []);

  useEffect(() => loadClassesEmail(), [loadClassesEmail]);

  const handleSaveClassesEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // Salva pela API, sem recarregar a página.
    if (isLoadingClassesEmail || isSavingClassesEmail) return;

    setClassesEmailFeedback(null);
    setIsSavingClassesEmail(true);

    try {
      const email = await ClassService.saveClassesEmail(classesEmail);
      setClassesEmail(email); // Mantém no campo o endereço aceito pelo servidor.
      setSavedClassesEmail(email); // Atualiza o endereço exibido no quadro de consulta.
      setIsEditingClassesEmail(false); // Volta ao quadro após o servidor aceitar o endereço.
      setClassesEmailFeedback({ type: 'success', message: 'E-mail salvo' });
    } catch (error) {
      setClassesEmailFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível salvar o e-mail das turmas'
      });
    } finally {
      setIsSavingClassesEmail(false);
    }
  };

  // Handle enrollment form submission
  const handleBulkEnrollStudents = async () => {
    if (!enrollmentPanelClass || selectedStudentsForEnrollment.size === 0) {
      onError('Please select students to enroll');
      return;
    }

    setIsEnrolling(true);
    
    try {
      // Enroll each selected student
      const enrollmentPromises = Array.from(selectedStudentsForEnrollment).map(studentCPF =>
        EnrollmentService.enrollStudent(enrollmentPanelClass.id, studentCPF)
      );
      
      await Promise.all(enrollmentPromises);
      
      // Reset enrollment panel
      setSelectedStudentsForEnrollment(new Set());
      setEnrollmentPanelClass(null);
      
      // Refresh class data
      onClassUpdated();
      
      onError(''); // Clear any previous errors
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setIsEnrolling(false);
    }
  };

  // Handle opening enrollment panel for a specific class
  const handleOpenEnrollmentPanel = (classObj: Class) => {
    setEnrollmentPanelClass(classObj);
    setSelectedStudentsForEnrollment(new Set());
  };

  // Handle closing enrollment panel
  const handleCloseEnrollmentPanel = () => {
    setEnrollmentPanelClass(null);
    setSelectedStudentsForEnrollment(new Set());
  };

  // Handle student selection toggle
  const handleStudentToggle = (studentCPF: string) => {
    const newSelection = new Set(selectedStudentsForEnrollment);
    if (newSelection.has(studentCPF)) {
      newSelection.delete(studentCPF);
    } else {
      newSelection.add(studentCPF);
    }
    setSelectedStudentsForEnrollment(newSelection);
  };

  // Handle select all/none
  const handleSelectAll = () => {
    if (!enrollmentPanelClass) return;
    
    const availableStudents = getAvailableStudentsForClass(enrollmentPanelClass);
    setSelectedStudentsForEnrollment(new Set(availableStudents.map(s => s.cpf)));
  };

  const handleSelectNone = () => {
    setSelectedStudentsForEnrollment(new Set());
  };

  // Get students not enrolled in a specific class
  const getAvailableStudentsForClass = (classObj: Class): Student[] => {
    const enrolledStudentCPFs = new Set(classObj.enrollments.map(enrollment => enrollment.student.cpf));
    return allStudents.filter(student => !enrolledStudentCPFs.has(student.cpf));
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'semester' || name === 'year' ? parseInt(value) : value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.topic.trim()) {
      onError('Topic is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (editingClass) {
        // Update existing class
        await ClassService.updateClass(editingClass.id, formData);
        onClassUpdated();
        setEditingClass(null);
      } else {
        // Add new class
        await ClassService.addClass(formData);
        onClassAdded();
      }
      
      // Reset form
      setFormData({
        topic: '',
        semester: 1,
        year: new Date().getFullYear(),
        especificacaoDoCalculoDaMedia: DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA
      });
    } catch (error) {
      onError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle edit button click
  const handleEdit = (classObj: Class) => {
    setEditingClass(classObj);
    setFormData({
      topic: classObj.topic,
      semester: classObj.semester,
      year: classObj.year,
      especificacaoDoCalculoDaMedia: classObj.especificacaoDoCalculoDaMedia
    });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingClass(null);
    setFormData({
      topic: '',
      semester: 1,
      year: new Date().getFullYear(),
      especificacaoDoCalculoDaMedia: DEFAULT_ESPECIFICACAO_DO_CALCULO_DE_MEDIA
    });
  };

  // Handle delete
  const handleDelete = async (classObj: Class) => {
    if (window.confirm(`Are you sure you want to delete the class "${classObj.topic} (${classObj.year}/${classObj.semester})"?`)) {
      try {
        await ClassService.deleteClass(classObj.id);
        onClassDeleted();
      } catch (error) {
        onError((error as Error).message);
      }
    }
  };

  // Generate current year options
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  if (reminderClass) { // Havendo uma turma selecionada, apresenta a configuração em lugar da listagem abaixo.
    return ( // classInfo recebe a turma; onBack limpa a seleção e faz o React apresentar a listagem novamente.
      <ReminderSettings
        classInfo={reminderClass}
        onBack={() => setReminderClass(null)}
      />
    );
  }

  return (
    <div className="classes-container">
      <h2>Class Management</h2>

      <section
        className={`class-form-container${showSavedClassesEmail ? ' classes-email-configured' : ''}`}
        aria-label="Cadastro de e-mail das turmas"
      >
        {showSavedClassesEmail ? (
          <div className="classes-email-saved">
            <div>
              <strong>E-mail para as turmas</strong>
              <p>{savedClassesEmail}</p>
            </div>

            <button type="button" onClick={() => {
              setIsEditingClassesEmail(true);
              setClassesEmailFeedback(null);
            }}>
              Alterar e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={handleSaveClassesEmail}>
            <div className="form-group">
              <label htmlFor="classes-email">E-mail para as turmas</label>
              <input
                id="classes-email"
                type="email"
                required
                value={classesEmail}
                disabled={isLoadingClassesEmail || isSavingClassesEmail}
                onChange={event => {
                  setClassesEmail(event.target.value);
                  setClassesEmailFeedback(null); // Remove o aviso do valor anterior.
                }}
              />
            </div>

            <div className="form-buttons">
              <button type="submit" disabled={isLoadingClassesEmail || isSavingClassesEmail}>
                {isLoadingClassesEmail ? 'Carregando…' : isSavingClassesEmail ? 'Salvando…' : 'Salvar e-mail'}
              </button>

              {savedClassesEmail !== null && (
                <button type="button" disabled={isSavingClassesEmail} onClick={() => {
                  setClassesEmail(savedClassesEmail); // Descarta o rascunho e recupera o endereço salvo.
                  setIsEditingClassesEmail(false);
                  setClassesEmailFeedback(null);
                }}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        )}

        {classesEmailFeedback && (
          <p role={classesEmailFeedback.type === 'error' ? 'alert' : 'status'}>
            {classesEmailFeedback.message}
          </p>
        )}
      </section>
      
      {/* Class Form */}
      <div className="class-form-container">
        <h3>{editingClass ? 'Edit Class' : 'Add New Class'}</h3>
        <form onSubmit={handleSubmit} className="class-form">
          <div className="form-row topic-row">
            <div className="form-group">
              <label htmlFor="topic">Topic:</label>
              <input
                type="text"
                id="topic"
                name="topic"
                value={formData.topic}
                onChange={handleInputChange}
                placeholder="e.g., Software Engineering, Introduction to Programming"
                required
              />
            </div>
          </div>

          <div className="form-row year-semester-row">
            <div className="form-group">
              <label htmlFor="year">Year:</label>
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                required
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="semester">Semester:</label>
              <select
                id="semester"
                name="semester"
                value={formData.semester}
                onChange={handleInputChange}
                required
              >
                <option value={1}>1st Semester</option>
                <option value={2}>2nd Semester</option>
              </select>
            </div>
          </div>

          <div className="form-buttons">
            <button type="submit" disabled={isSubmitting} className="submit-btn">
              {isSubmitting ? 'Saving...' : editingClass ? 'Update Class' : 'Add Class'}
            </button>
            {editingClass && (
              <button type="button" onClick={handleCancelEdit} className="cancel-btn">
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Classes List */}
      <div className="classes-list">
        <h3>Existing Classes ({classes.length})</h3>
        
        {classes.length === 0 ? (
          <div className="no-classes">
            No classes created yet. Add your first class using the form above.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Year</th>
                  <th>Semester</th>
                  <th>Enrolled Students</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((classObj) => (
                  <tr key={getClassId(classObj)}>
                    <td><strong>{classObj.topic}</strong></td>
                    <td><strong>{classObj.year}</strong></td>
                    <td><strong>{classObj.semester === 1 ? '1st Semester' : '2nd Semester'}</strong></td>
                    <td>{classObj.enrollments.length}</td>
                    <td>
                      <button
                        className="edit-btn"
                        onClick={() => handleEdit(classObj)}
                        title="Edit class"
                      >
                        Edit
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(classObj)}
                        title="Delete class"
                      >
                        Delete
                      </button>
                      <button
                        className="enroll-btn"
                        onClick={() => handleOpenEnrollmentPanel(classObj)}
                        title="Enroll students"
                      >
                        Enroll
                      </button>
                      <button
                        type="button"
                        onClick={() => setReminderClass(classObj)}
                      >{/* type="button" evita enviar formulários; onClick guarda a turma desta linha para abrir sua configuração. */}
                        Configurar lembretes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modern Enrollment Panel */}
      {enrollmentPanelClass && (
        <div className="enrollment-overlay">
          <div className="enrollment-modal">
            <div className="enrollment-modal-header">
              <h3>Enroll Students in {enrollmentPanelClass.topic}</h3>
              <button 
                className="close-modal-btn"
                onClick={handleCloseEnrollmentPanel}
                title="Close"
              >
                ×
              </button>
            </div>

            <div className="enrollment-modal-content">
              {/* Currently Enrolled Students */}
              <div className="current-enrollments">
                <h4>Currently Enrolled ({enrollmentPanelClass.enrollments.length}):</h4>
                {enrollmentPanelClass.enrollments.length === 0 ? (
                  <p className="no-enrollments">No students enrolled yet</p>
                ) : (
                  <div className="enrolled-students-list">
                    {enrollmentPanelClass.enrollments.map(enrollment => (
                      <span key={enrollment.student.cpf} className="enrolled-badge">
                        {enrollment.student.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Available Students to Enroll */}
              <div className="available-students">
                <div className="available-students-header">
                  <h4>Available Students ({getAvailableStudentsForClass(enrollmentPanelClass).length}):</h4>
                  <div className="selection-controls">
                    <button 
                      type="button"
                      className="select-all-btn"
                      onClick={handleSelectAll}
                      disabled={getAvailableStudentsForClass(enrollmentPanelClass).length === 0}
                    >
                      Select All
                    </button>
                    <button 
                      type="button"
                      className="select-none-btn"
                      onClick={handleSelectNone}
                    >
                      Select None
                    </button>
                  </div>
                </div>

                {getAvailableStudentsForClass(enrollmentPanelClass).length === 0 ? (
                  <p className="no-available-students">All registered students are already enrolled in this class</p>
                ) : (
                  <div className="students-grid">
                    {getAvailableStudentsForClass(enrollmentPanelClass).map(student => (
                      <div 
                        key={student.cpf} 
                        className={`student-card ${selectedStudentsForEnrollment.has(student.cpf) ? 'selected' : ''}`}
                        onClick={() => handleStudentToggle(student.cpf)}
                      >
                        <input 
                          type="checkbox"
                          checked={selectedStudentsForEnrollment.has(student.cpf)}
                          onChange={() => handleStudentToggle(student.cpf)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="student-info">
                          <div className="student-name">{student.name}</div>
                          <div className="student-cpf">{student.cpf}</div>
                          <div className="student-email">{student.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="enrollment-actions">
                <button 
                  className="cancel-btn"
                  onClick={handleCloseEnrollmentPanel}
                >
                  Cancel
                </button>
                <button 
                  className="enroll-selected-btn"
                  onClick={handleBulkEnrollStudents}
                  disabled={isEnrolling || selectedStudentsForEnrollment.size === 0}
                >
                  {isEnrolling 
                    ? 'Enrolling...' 
                    : `Enroll ${selectedStudentsForEnrollment.size} Student${selectedStudentsForEnrollment.size !== 1 ? 's' : ''}`
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
