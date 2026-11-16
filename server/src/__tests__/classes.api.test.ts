import * as fs from 'fs';
import request from 'supertest';
import { Express } from 'express';
import { newTestApp } from './support/newTestApp';

/**
 * Service tests for the class, enrollment and evaluation endpoints.
 * They record the behavior observed before refactoring, so that the
 * refactoring can be checked to preserve it (regression suite).
 */

const student = { name: 'Ana Lima', cpf: '123.456.789-01', email: 'ana@cin.ufpe.br' };
const otherStudent = { name: 'Bruno Melo', cpf: '987.654.321-00', email: 'bruno@cin.ufpe.br' };
const softwareEngineering = { topic: 'Software Engineering', semester: 1, year: 2025 };
const softwareEngineeringId = 'Software Engineering-2025-1';

const classPath = (classId: string) => `/api/classes/${encodeURIComponent(classId)}`;

// A fresh application (and therefore empty collections) for each test
let app: Express;
const clearState = () => {
  app = newTestApp();
};

const createStudent = (data = student) => request(app).post('/api/students').send(data).expect(201);
const createClass = (data = softwareEngineering) => request(app).post('/api/classes').send(data).expect(201);
const enroll = (classId: string, studentCPF: string) =>
  request(app).post(`${classPath(classId)}/enroll`).send({ studentCPF }).expect(201);

describe('Class endpoints', () => {
  beforeEach(clearState);

  test('GET /api/classes returns an empty list initially', async () => {
    const response = await request(app).get('/api/classes').expect(200);
    expect(response.body).toEqual([]);
  });

  test('POST /api/classes creates a class with a default average specification and no enrollments', async () => {
    const response = await createClass();
    expect(response.body).toEqual({
      id: softwareEngineeringId,
      topic: 'Software Engineering',
      semester: 1,
      year: 2025,
      averageCalculationSpecification: {
        gradeWeights: { MA: 10, MPA: 7, MANA: 0 },
        goalWeights: {
          Requirements: 1, 'Configuration Management': 1, 'Project Management': 1, Design: 1, Tests: 1, Refactoring: 1
        }
      },
      selfAssessmentRequest: null,
      discrepancyThreshold: 2,
      enrollments: []
    });
    const list = await request(app).get('/api/classes').expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].id).toBe(softwareEngineeringId);
  });

  test('POST /api/classes rejects missing fields', async () => {
    for (const body of [{}, { topic: 'X', semester: 1 }, { topic: 'X', year: 2025 }, { semester: 1, year: 2025 }]) {
      const response = await request(app).post('/api/classes').send(body).expect(400);
      expect(response.body.error).toBe('Topic, semester, and year are required');
    }
  });

  test('POST and PUT /api/classes reject fields of the wrong type', async () => {
    await createClass();
    const cases: [object, string][] = [
      [{ topic: { name: 'X' }, semester: 1, year: 2025 }, 'Topic must be a non-empty string'],
      [{ topic: '   ', semester: 1, year: 2025 }, 'Topic must be a non-empty string'],
      [{ topic: 'X', semester: '1', year: 2025 }, 'Semester and year must be integers'],
      [{ topic: 'X', semester: 1, year: 2025.5 }, 'Semester and year must be integers']
    ];
    for (const [body, error] of cases) {
      const created = await request(app).post('/api/classes').send(body).expect(400);
      expect(created.body.error).toBe(error);
      const updated = await request(app).put(classPath(softwareEngineeringId)).send(body).expect(400);
      expect(updated.body.error).toBe(error);
    }
  });

  test('POST /api/classes rejects a class with the same topic, year and semester', async () => {
    await createClass();
    const response = await request(app).post('/api/classes').send(softwareEngineering).expect(400);
    expect(response.body.error).toBe('Class with same topic, year, and semester already exists');
  });

  test('PUT /api/classes/:id updates topic, semester and year (and therefore the id)', async () => {
    await createClass();
    const response = await request(app)
      .put(classPath(softwareEngineeringId))
      .send({ topic: 'Software Engineering', semester: 2, year: 2026 })
      .expect(200);
    expect(response.body.id).toBe('Software Engineering-2026-2');
    expect(response.body.semester).toBe(2);
    expect(response.body.year).toBe(2026);
    const list = await request(app).get('/api/classes').expect(200);
    expect(list.body.map((c: any) => c.id)).toEqual(['Software Engineering-2026-2']);
  });

  test('PUT /api/classes/:id rejects an identification already used by another class', async () => {
    await createClass();
    await createClass({ topic: 'Databases', semester: 2, year: 2024 });
    const response = await request(app)
      .put(classPath(softwareEngineeringId))
      .send({ topic: 'Databases', semester: 2, year: 2024 })
      .expect(400);
    expect(response.body.error).toBe('Class with same topic, year, and semester already exists');
    const list = await request(app).get('/api/classes').expect(200);
    expect(list.body.map((c: any) => c.id).sort()).toEqual(['Databases-2024-2', softwareEngineeringId]);
  });

  test('PUT /api/classes/:id keeps enrollments', async () => {
    await createStudent();
    await createClass();
    await enroll(softwareEngineeringId, student.cpf);
    const response = await request(app)
      .put(classPath(softwareEngineeringId))
      .send({ topic: 'SE', semester: 1, year: 2025 })
      .expect(200);
    expect(response.body.enrollments).toHaveLength(1);
  });

  test('PUT /api/classes/:id rejects missing fields and unknown classes', async () => {
    await createClass();
    const missing = await request(app).put(classPath(softwareEngineeringId)).send({ topic: 'X' }).expect(400);
    expect(missing.body.error).toBe('Topic, semester, and year are required');
    const unknown = await request(app).put(classPath('Nope-2025-1')).send(softwareEngineering).expect(404);
    expect(unknown.body.error).toBe('Class not found');
  });

  test('DELETE /api/classes/:id removes the class', async () => {
    await createClass();
    await request(app).delete(classPath(softwareEngineeringId)).expect(204);
    const list = await request(app).get('/api/classes').expect(200);
    expect(list.body).toEqual([]);
  });

  test('DELETE /api/classes/:id answers 404 for an unknown class', async () => {
    const response = await request(app).delete(classPath('Nope-2025-1')).expect(404);
    expect(response.body.error).toBe('Class not found');
  });

  test('GET /api/classes/:classId/report returns the report placeholder', async () => {
    await createClass();
    const response = await request(app).get(`${classPath(softwareEngineeringId)}/report`).expect(200);
    expect(response.body).toMatchObject({
      classId: softwareEngineeringId,
      topic: 'Software Engineering',
      semester: 1,
      year: 2025,
      totalEnrolled: 0,
      studentsAverage: 0,
      approvedCount: 0,
      approvedFinalCount: 0,
      notApprovedCount: 0,
      evaluationPerformance: [],
      students: []
    });
    expect(typeof response.body.generatedAt).toBe('string');
    await request(app).get(`${classPath('Nope-2025-1')}/report`).expect(404);
  });

  test('POST /api/classes/gradeImport/:classId is not implemented and stores no upload', async () => {
    const response = await request(app)
      .post('/api/classes/gradeImport/any')
      .attach('file', Buffer.from('a,b\n1,2'), 'grades.csv')
      .expect(501);
    expect(response.body.error).toBe('Endpoint not implemented yet.');
    expect(fs.existsSync('tmp_data')).toBe(false);
  });
});

describe('Enrollment endpoints', () => {
  beforeEach(async () => {
    clearState();
    await createStudent();
    await createClass();
  });

  test('POST /api/classes/:classId/enroll enrolls a registered student', async () => {
    const response = await enroll(softwareEngineeringId, student.cpf);
    expect(response.body).toEqual({
      student: { name: 'Ana Lima', cpf: '123.456.789-01', email: 'ana@cin.ufpe.br' },
      evaluations: [],
      selfAssessments: [],
      averageBeforeFinalExam: null,
      averageAfterFinalExam: null,
      failedByAbsence: false
    });
    const list = await request(app).get('/api/classes').expect(200);
    expect(list.body[0].enrollments).toHaveLength(1);
  });

  test('POST /api/classes/:classId/enroll accepts the CPF without formatting', async () => {
    await enroll(softwareEngineeringId, '12345678901');
  });

  test('POST /api/classes/:classId/enroll validates its inputs', async () => {
    const noCPF = await request(app).post(`${classPath(softwareEngineeringId)}/enroll`).send({}).expect(400);
    expect(noCPF.body.error).toBe('Student CPF is required');
    const noClass = await request(app).post(`${classPath('Nope-2025-1')}/enroll`).send({ studentCPF: student.cpf }).expect(404);
    expect(noClass.body.error).toBe('Class not found');
    const noStudent = await request(app).post(`${classPath(softwareEngineeringId)}/enroll`).send({ studentCPF: otherStudent.cpf }).expect(404);
    expect(noStudent.body.error).toBe('Student not found');
  });

  test('POST /api/classes/:classId/enroll rejects a CPF that is not a string', async () => {
    const response = await request(app).post(`${classPath(softwareEngineeringId)}/enroll`).send({ studentCPF: 12345678901 }).expect(400);
    expect(response.body.error).toBe('Student CPF must be a string');
  });

  test('POST /api/classes/:classId/enroll rejects a student already enrolled', async () => {
    await enroll(softwareEngineeringId, student.cpf);
    const response = await request(app).post(`${classPath(softwareEngineeringId)}/enroll`).send({ studentCPF: student.cpf }).expect(400);
    expect(response.body.error).toBe('Student is already enrolled in this class');
  });

  test('GET /api/classes/:classId/enrollments lists the enrollments', async () => {
    await createStudent(otherStudent);
    await enroll(softwareEngineeringId, student.cpf);
    await enroll(softwareEngineeringId, otherStudent.cpf);
    const response = await request(app).get(`${classPath(softwareEngineeringId)}/enrollments`).expect(200);
    expect(response.body.map((e: any) => e.student.name)).toEqual(['Ana Lima', 'Bruno Melo']);
    await request(app).get(`${classPath('Nope-2025-1')}/enrollments`).expect(404);
  });

  test('DELETE /api/classes/:classId/enroll/:studentCPF removes the enrollment', async () => {
    await enroll(softwareEngineeringId, student.cpf);
    await request(app).delete(`${classPath(softwareEngineeringId)}/enroll/${student.cpf}`).expect(204);
    const response = await request(app).get(`${classPath(softwareEngineeringId)}/enrollments`).expect(200);
    expect(response.body).toEqual([]);
  });

  test('DELETE /api/classes/:classId/enroll/:studentCPF answers 404 when not enrolled', async () => {
    const response = await request(app).delete(`${classPath(softwareEngineeringId)}/enroll/${student.cpf}`).expect(404);
    expect(response.body.error).toBe('Student not enrolled in this class');
    await request(app).delete(`${classPath('Nope-2025-1')}/enroll/${student.cpf}`).expect(404);
  });

  test('deleting a student does not remove its enrollments', async () => {
    await enroll(softwareEngineeringId, student.cpf);
    await request(app).delete(`/api/students/${student.cpf}`).expect(204);
    const response = await request(app).get(`${classPath(softwareEngineeringId)}/enrollments`).expect(200);
    expect(response.body).toHaveLength(1);
  });
});

describe('Evaluation endpoints', () => {
  const evaluationPath = `${classPath(softwareEngineeringId)}/enrollments/${student.cpf}/evaluation`;

  beforeEach(async () => {
    clearState();
    await createStudent();
    await createClass();
    await enroll(softwareEngineeringId, student.cpf);
  });

  test('GET .../evaluation returns the student and both averages (null before any calculation)', async () => {
    const response = await request(app).get(evaluationPath).expect(200);
    expect(response.body).toEqual({
      student: { name: 'Ana Lima', cpf: '123.456.789-01', email: 'ana@cin.ufpe.br' },
      average: null,
      final_average: null
    });
  });

  test('GET .../evaluation answers 404 for unknown class or student', async () => {
    await request(app).get(`${classPath('Nope-2025-1')}/enrollments/${student.cpf}/evaluation`).expect(404);
    const response = await request(app).get(`${classPath(softwareEngineeringId)}/enrollments/${otherStudent.cpf}/evaluation`).expect(404);
    expect(response.body.error).toBe('Student not enrolled in this class');
  });

  test('PUT .../evaluation adds and then updates the grade of a goal', async () => {
    const added = await request(app).put(evaluationPath).send({ goal: 'Design', grade: 'MPA' }).expect(200);
    expect(added.body.evaluations).toEqual([{ goal: 'Design', grade: 'MPA' }]);
    const updated = await request(app).put(evaluationPath).send({ goal: 'Design', grade: 'MA' }).expect(200);
    expect(updated.body.evaluations).toEqual([{ goal: 'Design', grade: 'MA' }]);
    await request(app).put(evaluationPath).send({ goal: 'Tests', grade: 'MANA' }).expect(200);
    const list = await request(app).get(`${classPath(softwareEngineeringId)}/enrollments`).expect(200);
    expect(list.body[0].evaluations).toEqual([{ goal: 'Design', grade: 'MA' }, { goal: 'Tests', grade: 'MANA' }]);
  });

  test('PUT .../evaluation with an empty grade removes the evaluation', async () => {
    await request(app).put(evaluationPath).send({ goal: 'Design', grade: 'MA' }).expect(200);
    for (const grade of ['', null, undefined]) {
      const response = await request(app).put(evaluationPath).send({ goal: 'Design', grade }).expect(200);
      expect(response.body.evaluations).toEqual([]);
    }
  });

  test('PUT .../evaluation validates goal, grade, class and enrollment', async () => {
    const noGoal = await request(app).put(evaluationPath).send({ grade: 'MA' }).expect(400);
    expect(noGoal.body.error).toBe('Goal is required');
    const badGoal = await request(app).put(evaluationPath).send({ goal: ['Design'], grade: 'MA' }).expect(400);
    expect(badGoal.body.error).toBe('Goal must be a non-empty string');
    const badGrade = await request(app).put(evaluationPath).send({ goal: 'Design', grade: 'A' }).expect(400);
    expect(badGrade.body.error).toBe('Invalid grade. Must be MANA, MPA, or MA');
    await request(app).put(`${classPath('Nope-2025-1')}/enrollments/${student.cpf}/evaluation`).send({ goal: 'Design', grade: 'MA' }).expect(404);
    const notEnrolled = await request(app).put(`${classPath(softwareEngineeringId)}/enrollments/${otherStudent.cpf}/evaluation`).send({ goal: 'Design', grade: 'MA' }).expect(404);
    expect(notEnrolled.body.error).toBe('Student not enrolled in this class');
  });
});

describe('Student lookup and removal endpoints', () => {
  beforeEach(async () => {
    clearState();
    await createStudent();
  });

  test('GET /api/students/:cpf finds a student by formatted or plain CPF', async () => {
    for (const cpf of [student.cpf, '12345678901']) {
      const response = await request(app).get(`/api/students/${cpf}`).expect(200);
      expect(response.body).toEqual(student);
    }
    const missing = await request(app).get(`/api/students/${otherStudent.cpf}`).expect(404);
    expect(missing.body.error).toBe('Student not found');
  });

  test('DELETE /api/students/:cpf removes the student', async () => {
    await request(app).delete(`/api/students/${student.cpf}`).expect(204);
    const list = await request(app).get('/api/students').expect(200);
    expect(list.body).toEqual([]);
    const missing = await request(app).delete(`/api/students/${student.cpf}`).expect(404);
    expect(missing.body.error).toBe('Student not found');
  });

  test('POST and PUT /api/students reject fields that are not strings', async () => {
    const created = await request(app).post('/api/students').send({ name: 'X', cpf: 12345678901, email: 'x@x.com' }).expect(400);
    expect(created.body.error).toBe('Name, CPF, and email must be strings');
    const updated = await request(app).put(`/api/students/${student.cpf}`).send({ name: ['X'], email: 'x@x.com' }).expect(400);
    expect(updated.body.error).toBe('Name and email must be strings');
  });

  test('PUT /api/students/:cpf answers 400 for an unknown student', async () => {
    const response = await request(app).put(`/api/students/${otherStudent.cpf}`).send({ name: 'X', email: 'x@x.com' }).expect(400);
    expect(response.body.error).toBe('Student not found');
  });
});
