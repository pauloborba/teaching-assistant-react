import request from 'supertest';
import { app, classes, studentSet } from '../server';
import { Class } from '../models/Class';
import { Student } from '../models/Student';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA } from '../models/EspecificacaoDoCalculoDaMedia';

describe('GET /api/classes/:classId/students-status (integration test)', () => {
  let classId: string;

  beforeEach(() => {
    (studentSet as any).students = [];
    (classes as any).classes = [];
  });

  test('returns correct status for students in a class', async () => {

    const student1 = new Student('João', '11111111111', 'j@test.com');
    const student2 = new Student('Maria', '22222222222', 'm@test.com');

    studentSet.addStudent(student1);
    studentSet.addStudent(student2);

    const classObj = new Class(
      'Software Engineering',
      1,
      2025,
      DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA
    );

    classes.addClass(classObj);

    const enroll1 = classObj.addEnrollment(student1);
    // João com todas as notas altas
    enroll1.addOrUpdateEvaluation('Requirements', 'MA');
    enroll1.addOrUpdateEvaluation('Configuration Management', 'MA');
    enroll1.addOrUpdateEvaluation('Project Management', 'MA');
    enroll1.addOrUpdateEvaluation('Design', 'MA');
    enroll1.addOrUpdateEvaluation('Tests', 'MA');
    enroll1.addOrUpdateEvaluation('Refactoring', 'MA');

    const enroll2 = classObj.addEnrollment(student2);
    // Maria com notas baixas
    enroll2.addOrUpdateEvaluation('Requirements', 'MANA');
    enroll2.addOrUpdateEvaluation('Configuration Management', 'MANA');
    enroll2.addOrUpdateEvaluation('Project Management', 'MANA');
    enroll2.addOrUpdateEvaluation('Design', 'MANA');
    enroll2.addOrUpdateEvaluation('Tests', 'MANA');
    enroll2.addOrUpdateEvaluation('Refactoring', 'MANA');

    classId = classObj.getClassId();

    const res = await request(app)
      .get(`/api/classes/${classId}/students-status`)
      .expect(200);

    const byCpf: Record<string, string> = {};

    res.body.forEach((r: any) => {
      byCpf[r.student.cpf] = r.statusColor;
    });

    expect(byCpf['11111111111']).toBe('green'); // João com média alta
    expect(byCpf['22222222222']).toBe('red'); // Maria com média muito baixa
  });

  test('returns red status for student with previous failure even with high grades', async () => {
    const student = new Student('Roberto Recorrente', '33333333333', 'roberto@test.com');
    studentSet.addStudent(student);

    // Criar turma passada (2024/2)
    const pastClass = new Class(
      'Software Engineering',
      2,
      2024,
      DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA
    );
    classes.addClass(pastClass);

    // Matricular e reprovar o aluno na turma passada com todas as avaliações
    const pastEnrollment = pastClass.addEnrollment(student);
    pastEnrollment.addOrUpdateEvaluation('Requirements', 'MANA');
    pastEnrollment.addOrUpdateEvaluation('Configuration Management', 'MANA');
    pastEnrollment.addOrUpdateEvaluation('Project Management', 'MANA');
    pastEnrollment.addOrUpdateEvaluation('Design', 'MANA');
    pastEnrollment.addOrUpdateEvaluation('Tests', 'MANA');
    pastEnrollment.addOrUpdateEvaluation('Refactoring', 'MANA');
    // Média será 4.0 (todas MANA), aluno reprovado

    // Criar turma atual (2025/1)
    const currentClass = new Class(
      'Software Engineering',
      1,
      2025,
      DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA
    );
    classes.addClass(currentClass);

    // Matricular o aluno com notas altas na turma atual
    const currentEnrollment = currentClass.addEnrollment(student);
    currentEnrollment.addOrUpdateEvaluation('Requirements', 'MA');
    currentEnrollment.addOrUpdateEvaluation('Configuration Management', 'MA');
    currentEnrollment.addOrUpdateEvaluation('Project Management', 'MA');
    currentEnrollment.addOrUpdateEvaluation('Design', 'MA');
    currentEnrollment.addOrUpdateEvaluation('Tests', 'MA');
    currentEnrollment.addOrUpdateEvaluation('Refactoring', 'MA');

    classId = currentClass.getClassId();

    const res = await request(app)
      .get(`/api/classes/${classId}/students-status`)
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].statusColor).toBe('red'); // Vermelho por causa da reprovação anterior
  });
});
