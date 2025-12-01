import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';

const testDataFile = path.resolve('./data/app-data.test.json');

describe('Student Enrollment Integration Tests', () => {
  let app: any;
  let resetServerState: any;

  beforeEach(() => {
    if (fs.existsSync(testDataFile)) fs.unlinkSync(testDataFile);
    
    // Reset modules and re-import to get fresh server state
    jest.resetModules();
    const server = require('../server');
    app = server.app;
    resetServerState = server.resetServerState;
    resetServerState();
  });

  afterAll(() => {
    if (fs.existsSync(testDataFile)) fs.unlinkSync(testDataFile);
  });

  test('should successfully enroll a student in a class', async () => {
    const studentRes = await request(app)
      .post('/api/students')
      .send({ name: 'Joao Silva', cpf: '12345678901', email: 'joao@example.com' })
      .expect(201);

    const studentCPF = studentRes.body.cpf;

    const classRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'Math', semester: 1, year: 2025 })
      .expect(201);

    const classId = classRes.body.id;

    const enrollRes = await request(app)
      .post(`/api/classes/${classId}/enroll`)
      .send({ studentCPF })
      .expect(201);

    expect(enrollRes.body).toHaveProperty('student');
    expect(enrollRes.body.student.cpf).toBe(studentCPF);
    expect(enrollRes.body.student.name).toBe('Joao Silva');
    expect(enrollRes.body).toHaveProperty('evaluations');
    expect(Array.isArray(enrollRes.body.evaluations)).toBe(true);
  });

  test('should return 404 when enrolling student in non-existent class', async () => {
    const studentRes = await request(app)
      .post('/api/students')
      .send({ name: 'Maria Santos', cpf: '98765432102', email: 'maria@example.com' })
      .expect(201);

    const studentCPF = studentRes.body.cpf;

    const enrollRes = await request(app)
      .post('/api/classes/NonExistentClass-2025-1/enroll')
      .send({ studentCPF })
      .expect(404);

    expect(enrollRes.body).toHaveProperty('error');
    expect(enrollRes.body.error).toBe('Class not found');
  });

  test('should return 404 when enrolling non-existent student', async () => {
    const classRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'Physics', semester: 2, year: 2025 })
      .expect(201);

    const classId = classRes.body.id;

    const enrollRes = await request(app)
      .post(`/api/classes/${classId}/enroll`)
      .send({ studentCPF: '111.111.111-11' })
      .expect(404);

    expect(enrollRes.body).toHaveProperty('error');
    expect(enrollRes.body.error).toBe('Student not found');
  });

  test('should return 400 when trying to enroll same student twice', async () => {
    const studentRes = await request(app)
      .post('/api/students')
      .send({ name: 'Pedro Costa', cpf: '11122233303', email: 'pedro@example.com' })
      .expect(201);

    const studentCPF = studentRes.body.cpf;

    const classRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'Chemistry', semester: 1, year: 2025 })
      .expect(201);

    const classId = classRes.body.id;

    await request(app)
      .post(`/api/classes/${classId}/enroll`)
      .send({ studentCPF })
      .expect(201);

    const secondEnrollRes = await request(app)
      .post(`/api/classes/${classId}/enroll`)
      .send({ studentCPF })
      .expect(400);

    expect(secondEnrollRes.body).toHaveProperty('error');
    expect(secondEnrollRes.body.error).toBe('Student is already enrolled in this class');
  });

  test('should successfully unenroll a student from a class', async () => {
    const studentRes = await request(app)
      .post('/api/students')
      .send({ name: 'Ana Oliveira', cpf: '55566677704', email: 'ana@example.com' })
      .expect(201);

    const studentCPF = studentRes.body.cpf;

    const classRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'Biologia', semester: 2, year: 2025 })
      .expect(201);

    const classId = classRes.body.id;

    await request(app)
      .post(`/api/classes/${classId}/enroll`)
      .send({ studentCPF })
      .expect(201);

    const enrollmentsRes = await request(app)
      .get(`/api/classes/${classId}/enrollments`)
      .expect(200);

    expect(enrollmentsRes.body.length).toBe(1);

    const unenrollRes = await request(app)
      .delete(`/api/classes/${classId}/enroll/${studentCPF}`)
      .expect(204);

    const enrollmentsAfterRes = await request(app)
      .get(`/api/classes/${classId}/enrollments`)
      .expect(200);

    expect(enrollmentsAfterRes.body.length).toBe(0);
  });

  test('should return 404 when unenrolling student not enrolled', async () => {
    const studentRes = await request(app)
      .post('/api/students')
      .send({ name: 'Carlos Souza', cpf: '44455566605', email: 'carlos@example.com' })
      .expect(201);

    const studentCPF = studentRes.body.cpf;

    const classRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'History', semester: 1, year: 2025 })
      .expect(201);

    const classId = classRes.body.id;

    const unenrollRes = await request(app)
      .delete(`/api/classes/${classId}/enroll/${studentCPF}`)
      .expect(404);

    expect(unenrollRes.body).toHaveProperty('error');
    expect(unenrollRes.body.error).toBe('Student not enrolled in this class');
  });

  test('should get all enrollments for a class', async () => {
    const student1Res = await request(app)
      .post('/api/students')
      .send({ name: 'Laura Lima', cpf: '77788899906', email: 'laura@example.com' })
      .expect(201);

    const student2Res = await request(app)
      .post('/api/students')
      .send({ name: 'Roberto Alves', cpf: '88899900007', email: 'roberto@example.com' })
      .expect(201);

    const student1CPF = student1Res.body.cpf;
    const student2CPF = student2Res.body.cpf;

    const classRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'Geografia', semester: 2, year: 2025 })
      .expect(201);

    const classId = classRes.body.id;

    await request(app)
      .post(`/api/classes/${classId}/enroll`)
      .send({ studentCPF: student1CPF })
      .expect(201);

    await request(app)
      .post(`/api/classes/${classId}/enroll`)
      .send({ studentCPF: student2CPF })
      .expect(201);

    const enrollmentsRes = await request(app)
      .get(`/api/classes/${classId}/enrollments`)
      .expect(200);

    expect(Array.isArray(enrollmentsRes.body)).toBe(true);
    expect(enrollmentsRes.body.length).toBe(2);
    expect(enrollmentsRes.body[0]).toHaveProperty('student');
    expect(enrollmentsRes.body[0]).toHaveProperty('evaluations');
    expect(enrollmentsRes.body[1]).toHaveProperty('student');
    expect(enrollmentsRes.body[1]).toHaveProperty('evaluations');
  });

  test('should persist enrollments to file', async () => {
    const studentRes = await request(app)
      .post('/api/students')
      .send({ name: 'Fernanda Costa', cpf: '99900011108', email: 'fernanda@example.com' })
      .expect(201);

    const studentCPF = studentRes.body.cpf;

    const classRes = await request(app)
      .post('/api/classes')
      .send({ topic: 'Artes', semester: 1, year: 2025 })
      .expect(201);

    const classId = classRes.body.id;

    await request(app)
      .post(`/api/classes/${classId}/enroll`)
      .send({ studentCPF })
      .expect(201);

    expect(fs.existsSync(testDataFile)).toBe(true);

    const fileContent = fs.readFileSync(testDataFile, 'utf-8');
    const data = JSON.parse(fileContent);

    expect(data).toHaveProperty('classes');
    const savedClass = data.classes.find((c: any) => c.topic === 'Artes');
    expect(savedClass).toBeDefined();
    expect(savedClass.enrollments).toBeDefined();
    expect(savedClass.enrollments.length).toBe(1);
    expect(savedClass.enrollments[0].studentCPF).toBe(studentRes.body.cpf.replace(/\D/g, ''));
  });
});
