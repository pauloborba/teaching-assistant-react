import request from 'supertest';
import { app, studentSet, classes } from '../server';
import { Student } from '../models/Student';
import { Class } from '../models/Class';
import { EspecificacaoDoCalculoDaMedia, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';
import { enviarEmail } from '../services/EmailSender';

// Mock do módulo EmailSender para evitar o envio real de emails
jest.mock('../services/EmailSender');
const mockedEnviarEmail = enviarEmail as jest.Mock;

describe('Notification API Endpoints - Integration Tests', () => {
  let student1: Student;
  let class1: Class;
  let class2: Class;
  const professorNome = 'Prof. Teste';

  beforeAll(() => {
    // Configuração inicial dos dados
    student1 = new Student('Aluno Teste 1', '11111111111', 'aluno1@teste.com');
    const student2 = new Student('Aluno Teste 2', '22222222222', 'aluno2@teste.com');
    const student3 = new Student('Aluno Teste 3', '33333333333', 'aluno3@teste.com');

    studentSet.addStudent(student1);
    studentSet.addStudent(student2);
    studentSet.addStudent(student3);

    class1 = new Class('Disciplina A', 1, 2025, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
    class2 = new Class('Disciplina B', 1, 2025, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);

    classes.addClass(class1);
    classes.addClass(class2);

    // Matrícula e notas para a Disciplina A (Individual)
    const enrollment1 = class1.addEnrollment(student1);
    enrollment1.setMediaPreFinal(7.5); // Média pré-final para teste de aprovação

    // Matrícula e notas para a Disciplina B (Lote)
    const enrollment2 = class2.addEnrollment(student2);
    enrollment2.setMediaPreFinal(9.0); // Média pré-final para teste de aprovação

    const enrollment3 = class2.addEnrollment(student3);
    enrollment3.setMediaPreFinal(2.0); // Média pré-final para teste de reprovação
  });

  beforeEach(() => {
    mockedEnviarEmail.mockClear();
  });

  afterAll(() => {
    // Limpeza dos dados
    studentSet.removeStudent(student1.getCPF());
    studentSet.removeStudent('22222222222');
    studentSet.removeStudent('33333333333');
    classes.removeClass(class1.getClassId());
    classes.removeClass(class2.getClassId());
  });

  describe('POST /api/notifications/grade-result (Individual Notification)', () => {
    const endpoint = '/api/notifications/grade-result';

    test('deve enviar notificação individual com sucesso (Aprovado)', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({
          studentCPF: student1.getCPF(),
          disciplina: class1.getTopic(),
          professorNome: professorNome,
        })
        .expect(200);

      expect(response.body.message).toBe('Notificação enviada com sucesso');
      expect(mockedEnviarEmail).toHaveBeenCalledTimes(1);

      const [, emailAluno, assunto, mensagem] = mockedEnviarEmail.mock.calls[0];
      expect(emailAluno).toBe(student1.email);
      expect(assunto).toContain(class1.getTopic());
      expect(mensagem).toContain('Aprovado por média');
      expect(mensagem).toContain('Sua nota em Disciplina A foi 7.5');
    });

    test('deve retornar 400 se faltarem parâmetros', async () => {
      await request(app)
        .post(endpoint)
        .send({ studentCPF: student1.getCPF(), disciplina: class1.getTopic() }) // Falta professorNome
        .expect(400);
      
      expect(mockedEnviarEmail).not.toHaveBeenCalled();
    });

    test('deve retornar 404 se o aluno não for encontrado', async () => {
      await request(app)
        .post(endpoint)
        .send({
          studentCPF: '99999999999',
          disciplina: class1.getTopic(),
          professorNome: professorNome,
        })
        .expect(404);
      
      expect(mockedEnviarEmail).not.toHaveBeenCalled();
    });

    test('deve retornar 404 se a disciplina não for encontrada', async () => {
      await request(app)
        .post(endpoint)
        .send({
          studentCPF: student1.getCPF(),
          disciplina: 'Disciplina Inexistente',
          professorNome: professorNome,
        })
        .expect(404);
      
      expect(mockedEnviarEmail).not.toHaveBeenCalled();
    });

    test('deve retornar 404 se o aluno não estiver matriculado na disciplina', async () => {
      // Usar student1 na class2, onde ele não está matriculado
      await request(app)
        .post(endpoint)
        .send({
          studentCPF: student1.getCPF(),
          disciplina: class2.getTopic(),
          professorNome: professorNome,
        })
        .expect(404);
      
      expect(mockedEnviarEmail).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/notifications/batch-result (Batch Notification)', () => {
    const endpoint = '/api/notifications/batch-result';

    test('deve enviar notificação em lote com sucesso para todos os alunos', async () => {
      const response = await request(app)
        .post(endpoint)
        .send({
          classId: class2.getClassId(),
          disciplina: class2.getTopic(),
          professorNome: professorNome,
        })
        .expect(200);

      expect(response.body.message).toBe('Notificações enviadas com sucesso');
      expect(response.body.totalEnviados).toBe(2);
      expect(mockedEnviarEmail).toHaveBeenCalledTimes(2);

      // Verifica se as notificações foram enviadas para os alunos corretos com as notas corretas
      const emailsEnviados = mockedEnviarEmail.mock.calls.map(call => call[1]);
      expect(emailsEnviados).toContain('aluno2@teste.com'); // Aprovado (9.0)
      expect(emailsEnviados).toContain('aluno3@teste.com'); // Reprovado (2.0)
    });

    test('deve retornar 400 se faltarem parâmetros', async () => {
      await request(app)
        .post(endpoint)
        .send({ classId: class2.getClassId(), disciplina: class2.getTopic() }) // Falta professorNome
        .expect(400);
      
      expect(mockedEnviarEmail).not.toHaveBeenCalled();
    });

    test('deve retornar 404 se a disciplina não for encontrada', async () => {
      await request(app)
        .post(endpoint)
        .send({
          classId: 'id-inexistente',
          disciplina: class2.getTopic(),
          professorNome: professorNome,
        })
        .expect(404);
      
      expect(mockedEnviarEmail).not.toHaveBeenCalled();
    });

    test('deve retornar 404 se não houver alunos matriculados', async () => {
      // Cria uma nova turma sem matrículas
      const classEmpty = new Class('Disciplina Vazia', 2, 2025, DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA);
      classes.addClass(classEmpty);

      await request(app)
        .post(endpoint)
        .send({
          classId: classEmpty.getClassId(),
          disciplina: classEmpty.getTopic(),
          professorNome: professorNome,
        })
        .expect(404);
      
      expect(mockedEnviarEmail).not.toHaveBeenCalled();
      classes.removeClass(classEmpty.getClassId());
    });
  });
});
