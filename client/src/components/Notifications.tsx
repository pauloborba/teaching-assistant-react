import React, { useState, useEffect, useCallback } from 'react';
import { Class } from '../types/Class';
import { Student } from '../types/Student';
import ClassService from '../services/ClassService';
import { studentService } from '../services/StudentService';
import NotificationService from '../services/NotificationService';

interface NotificationsProps {
  onError: (errorMessage: string) => void;
  onSuccess: (successMessage: string) => void;
}

const Notifications: React.FC<NotificationsProps> = ({ onError, onSuccess }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [notificationType, setNotificationType] = useState<'grade-result' | 'batch-result' | 'grade-update' | 'batch-update'>('grade-result');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudentCPF, setSelectedStudentCPF] = useState<string>('');

  useEffect(() => {
    if (selectedClassId) {
      const classObj = classes.find(c => c.id === selectedClassId);
      setSelectedClass(classObj || null);
      
      // Filtrar alunos matriculados
      if (classObj) {
        const enrolledCPFs = classObj.enrollments.map(e => e.student.cpf);
        const filteredStudents = students.filter(student => enrolledCPFs.includes(student.cpf));
        setEnrolledStudents(filteredStudents);
      } else {
        setEnrolledStudents([]);
      }
    } else {
      setSelectedClass(null);
      setEnrolledStudents([]);
    }

    // Resetar aluno selecionado ao mudar de disciplina
    setSelectedStudentCPF('');
  }, [selectedClassId, classes, students]);
    
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      const [classesData, studentsData] = await Promise.all([
        ClassService.getAllClasses(),
        studentService.getAllStudents()
      ]);

      setClasses(classesData);
      setStudents(studentsData);
    } catch (error) {
      onError(`Failed to load data: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const professorNome = "Professor(a) da Disciplina";

    try {
      setIsLoading(true);

      switch (notificationType) {
        case 'grade-result':
          if (!selectedStudentCPF || !selectedClass) {
            onError('Por favor, selecione a disciplina e o aluno');
            return;
          }
          // Nota será calculada no backend
          await NotificationService.sendGradeResultNotification({
            studentCPF: selectedStudentCPF,
            disciplina: selectedClass.topic,
            professorNome
          });

          onSuccess('Notificação de resultado enviada com sucesso!');
          break;
          
        case 'batch-result':
          if (!selectedClass) {
            onError('Por favor, selecione a disciplina');
            return;
          }

          // Envio em lote para todos os alunos matriculados na disciplina
          const result = await NotificationService.sendBatchResultNotification({
            classId: selectedClass.id,
            disciplina: selectedClass.topic,
            professorNome
          });

          onSuccess(`Notificações de resultado enviadas com sucesso para ${result.totalEnviados} aluno(s)!`);
          break;

        case 'grade-update':
          if (!selectedStudentCPF || !selectedClass) {
            onError('Por favor, selecione a disciplina e o aluno');
            return;
          }

          // Implementar notificação de atualização de nota individual
          await NotificationService.sendGradeUpdateNotification({
            studentCPF: selectedStudentCPF,
            disciplina: selectedClass.topic,
            professorNome
          });

          onSuccess('Notificação de atualização de nota enviada com sucesso!');
          break;

        case 'batch-update':
          if (!selectedClass) {
            onError('Por favor, selecione a disciplina');
            return;
          }

          // Implementar notificação de atualização de nota em lote
          const updateResult = await NotificationService.sendBatchUpdateNotification({
            classId: selectedClass.id,
            disciplina: selectedClass.topic,
            professorNome
          });

          onSuccess(`Notificações de atualização enviadas com sucesso para ${updateResult.totalEnviados} aluno(s)!`);
          break;
      }

      // Reset form
      resetForm();
    } catch (error) {
      onError(`Erro ao enviar notificação: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedStudentCPF('');
  };

  if (isLoading && classes.length === 0) {
    return (
      <div className="notification-section">
        <h3>Notificações por Email</h3>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Carregando dados...
        </div>
      </div>
    );
  }

  return (
    <div className="notification-section">
      <h3>Notificações por Email</h3>
      
      <form onSubmit={handleSubmit} className="notification-form">
        {/* Notification Type */}
        <div className="form-group">
          <label htmlFor="notificationType">Tipo de Notificação *</label>
          <select
            id="notificationType"
            value={notificationType}
            onChange={(e) => {
              setNotificationType(e.target.value as 'grade-result' | 'batch-result' | 'grade-update' | 'batch-update');
              resetForm();
            }}
          >
            <option value="grade-result">Resultado da Disciplina (Individual)</option>
            <option value="batch-result">Resultado da Disciplina (Lote)</option>
            <option value="grade-update">Atualização de Nota (Individual)</option>
            <option value="batch-update">Atualização de Nota (Lote)</option>
          </select>
        </div>

        {/* Class Selection (for all notification types) */}
        <div className="form-group">
          <label htmlFor="classSelect">Disciplina *</label>
          <select
            id="classSelect"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            required
          >
            <option value="">-- Selecione uma disciplina --</option>
            {classes.map((classObj) => (
              <option key={classObj.id} value={classObj.id}>
                {classObj.topic} ({classObj.year}/{classObj.semester})
              </option>
            ))}
          </select>
        </div>

        {/* Student Selection (for individual notifications) */}
        {(notificationType === 'grade-result' || notificationType === 'grade-update') && (
          <div className="form-group">
            <label htmlFor="studentSelect">Aluno *</label>
            <select
              id="studentSelect"
              value={selectedStudentCPF}
              onChange={(e) => setSelectedStudentCPF(e.target.value)}
              required
            >
              <option value="">-- Selecione um aluno --</option>
              {enrolledStudents.map((student) => (
                <option key={student.cpf} value={student.cpf}>
                  {student.name} - {student.cpf}
                </option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" disabled={isLoading} className="submit-button">
          {isLoading ? 'Enviando...' : 'Enviar Notificação'}
        </button>
      </form>
    </div>
  );
};

export default Notifications;
