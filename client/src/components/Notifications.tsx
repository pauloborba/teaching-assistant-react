import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Class } from '../types/Class';
import { Student } from '../types/Student';
import ClassService from '../services/ClassService';
import { studentService } from '../services/StudentService';
import NotificationService from '../services/NotificationService';

interface NotificationsProps {
  onError: (errorMessage: string) => void;
  onSuccess: (successMessage: string) => void;
}

// Constante movida para fora do componente para evitar recriação
const PROFESSOR_NOME_PLACEHOLDER = "Professor(a) da Disciplina";

const Notifications: React.FC<NotificationsProps> = ({ onError, onSuccess }) => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [notificationType, setNotificationType] = useState<'grade-result' | 'grade-update' | 'batch-result'>('grade-result');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudentCPF, setSelectedStudentCPF] = useState<string>('');

  const selectedClass = useMemo(() => 
    classes.find(c => c.id === selectedClassId) || null,
    [selectedClassId, classes]
  );

  const enrolledStudents = useMemo(() => {
    if (!selectedClass) {
      return [];
    }
    const enrolledCPFs = selectedClass.enrollments.map(e => e.student.cpf);
    return students.filter(student => enrolledCPFs.includes(student.cpf));
  }, [selectedClass, students]);

  useEffect(() => {
    // Resetar aluno selecionado ao mudar de disciplina ou de turma
    setSelectedStudentCPF('');
  }, [selectedClassId]);

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

  const resetForm = () => {
    setSelectedClassId('');
    setSelectedStudentCPF('');
  };

  const handleNotificationTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setNotificationType(e.target.value as any);
    resetForm();
  };

  const handleIndividualSubmit = async () => {
    if (!selectedClass || !selectedStudentCPF) {
      onError('Por favor, selecione a disciplina e o aluno');
      return;
    }
    await NotificationService.sendGradeResultNotification({
      studentCPF: selectedStudentCPF,
      disciplina: selectedClass.topic,
      professorNome: PROFESSOR_NOME_PLACEHOLDER
    });
    onSuccess('Notificação de resultado enviada com sucesso!');
  };

  const handleBatchSubmit = async () => {
    if (!selectedClass) {
      onError('Por favor, selecione a disciplina');
      return;
    }
    const result = await NotificationService.sendBatchResultNotification({
      classId: selectedClass.id,
      disciplina: selectedClass.topic,
      professorNome: PROFESSOR_NOME_PLACEHOLDER
    });
    onSuccess(`Notificações de resultado enviadas com sucesso para ${result.totalEnviados} aluno(s)!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      switch (notificationType) {
        case 'grade-result':
          await handleIndividualSubmit();
          break;
        case 'batch-result':
          await handleBatchSubmit();
          break;
        case 'grade-update':
          onError('Funcionalidade de Atualização de Nota não implementada.');
          break;
      }
      resetForm();
    } catch (error) {
      onError(`Erro ao enviar notificação: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
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
        <div className="form-group">
          <label htmlFor="notificationType">Tipo de Notificação *</label>
          <select
            id="notificationType"
            value={notificationType}
            onChange={handleNotificationTypeChange}
          >
            <option value="grade-result">Resultado da Disciplina (Individual)</option>
            <option value="batch-result">Resultado da Disciplina (Lote)</option>
            <option value="grade-update">Atualização de Nota</option>
          </select>
        </div>

        {(notificationType === 'grade-result' || notificationType === 'batch-result') && (
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
        )}

        {notificationType === 'grade-result' && (
          <div className="form-group">
            <label htmlFor="studentSelect">Aluno *</label>
            <select
              id="studentSelect"
              value={selectedStudentCPF}
              onChange={(e) => setSelectedStudentCPF(e.target.value)}
              required
              disabled={!selectedClassId} // Desabilitar se nenhuma turma for selecionada
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