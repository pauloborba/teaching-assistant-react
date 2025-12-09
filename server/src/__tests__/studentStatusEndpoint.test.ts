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
    enroll1.addOrUpdateEvaluation('Gerência de Projeto', 'MA'); // Alta

    const enroll2 = classObj.addEnrollment(student2);
    enroll2.addOrUpdateEvaluation('Gerência de Projeto', 'MPA'); // Média
    enroll2.setReprovadoPorFalta(false);

    classId = classObj.getClassId();

    const res = await request(app)
      .get(`/api/classes/${classId}/students-status`)
      .expect(200);

    const byCpf: Record<string, string> = {};

    res.body.forEach((r: any) => {
      byCpf[r.student.cpf] = r.statusColor;
    });

    expect(byCpf['11111111111']).toBe('green');
    expect(byCpf['22222222222']).toBe('red');
  });
});
