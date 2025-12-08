import { notificarResultadoDisciplina, notificarAlunosEmLote } from '../services/gradenotification';
import { Student } from '../models/Student';
import { enviarEmail } from '../services/EmailSender';

// Mock do módulo EmailSender
jest.mock('../services/EmailSender');

// Type-cast do mock para ter acesso aos métodos do jest
const mockedEnviarEmail = enviarEmail as jest.Mock;

describe('Notification Service (gradenotification.ts) - Unit Tests', () => {
  beforeEach(() => {
    mockedEnviarEmail.mockClear();
  });

  const mockProfessor = 'Dr. Teste';
  const mockDisciplina = 'Matemática';
  const mockStudent = new Student('Aluno Teste', '12345678901', 'aluno@teste.com');

  describe('notificarResultadoDisciplina', () => {
    test('deve enviar email para aluno aprovado (nota >= 7)', async () => {
      const nota = 7.5;
      await notificarResultadoDisciplina(mockStudent, nota, mockDisciplina, mockProfessor);

      expect(mockedEnviarEmail).toHaveBeenCalledTimes(1);
      const [professorNome, emailAluno, assunto, mensagem] = mockedEnviarEmail.mock.calls[0];

      expect(professorNome).toBe(mockProfessor);
      expect(emailAluno).toBe(mockStudent.email);
      expect(assunto).toBe(`Resultado da Disciplina ${mockDisciplina}`);
      expect(mensagem).toContain('Aprovado por média');
      expect(mensagem).toContain(`Sua nota em ${mockDisciplina} foi ${nota.toFixed(1)}`);
    });

    test('deve enviar email para aluno em final (7 > nota >= 3)', async () => {
      const nota = 5.0;
      await notificarResultadoDisciplina(mockStudent, nota, mockDisciplina, mockProfessor);

      expect(mockedEnviarEmail).toHaveBeenCalledTimes(1);
      const [, , , mensagem] = mockedEnviarEmail.mock.calls[0];

      expect(mensagem).toContain('Final');
      expect(mensagem).toContain(`Sua nota em ${mockDisciplina} foi ${nota.toFixed(1)}`);
    });

    test('deve enviar email para aluno reprovado (nota < 3)', async () => {
      const nota = 2.9;
      await notificarResultadoDisciplina(mockStudent, nota, mockDisciplina, mockProfessor);

      expect(mockedEnviarEmail).toHaveBeenCalledTimes(1);
      const [, , , mensagem] = mockedEnviarEmail.mock.calls[0];

      expect(mensagem).toContain('Reprovado');
      expect(mensagem).toContain(`Sua nota em ${mockDisciplina} foi ${nota.toFixed(1)}`);
    });

    test('deve formatar a nota com uma casa decimal', async () => {
      const nota = 8.0;
      await notificarResultadoDisciplina(mockStudent, nota, mockDisciplina, mockProfessor);

      expect(mockedEnviarEmail).toHaveBeenCalledTimes(1);
      const [, , , mensagem] = mockedEnviarEmail.mock.calls[0];

      expect(mensagem).toContain('Sua nota em Matemática foi 8.0');
    });
  });

  describe('notificarAlunosEmLote', () => {
    const student1 = new Student('Aluno 1', '11111111111', 'aluno1@teste.com');
    const student2 = new Student('Aluno 2', '22222222222', 'aluno2@teste.com');
    const students = [student1, student2];

    test('deve chamar notificarResultadoDisciplina para cada aluno', async () => {
      const getNota = (student: Student) => (student.getCPF() === '11111111111' ? 8.0 : 2.0);

      const totalEnviados = await notificarAlunosEmLote(students, mockDisciplina, mockProfessor, getNota);

      expect(totalEnviados).toBe(2);
      expect(mockedEnviarEmail).toHaveBeenCalledTimes(2);

      // Verifica a chamada para o Aluno 1 (Aprovado)
      const [p1, e1, a1, m1] = mockedEnviarEmail.mock.calls[0];
      expect(e1).toBe(student1.email);
      expect(m1).toContain('Aprovado por média');
      expect(m1).toContain('Sua nota em Matemática foi 8.0');

      // Verifica a chamada para o Aluno 2 (Reprovado)
      const [p2, e2, a2, m2] = mockedEnviarEmail.mock.calls[1];
      expect(e2).toBe(student2.email);
      expect(m2).toContain('Reprovado');
      expect(m2).toContain('Sua nota em Matemática foi 2.0');
    });

    test('deve retornar 0 se a lista de alunos estiver vazia', async () => {
      const getNota = () => 0;
      const totalEnviados = await notificarAlunosEmLote([], mockDisciplina, mockProfessor, getNota);

      expect(totalEnviados).toBe(0);
      expect(mockedEnviarEmail).not.toHaveBeenCalled();
    });
  });
});
