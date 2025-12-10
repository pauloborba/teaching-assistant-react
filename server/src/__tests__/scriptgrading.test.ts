import request from 'supertest';
import { app, scriptAnswerSet, scripts, studentSet } from '../server';
import { Student } from '../models/Student';
import { TaskAnswer } from '../models/TaskAnswer';

describe('Server API – Script Answers Endpoints', () => {

  // Clean state before each test
  beforeEach(() => {
    // Clear students
    const allStudents = studentSet.getAllStudents();
    allStudents.forEach(s => studentSet.removeStudent(s.getCPF()));

    // Clear script answers
    const allAnswers = scriptAnswerSet.getAll();
    allAnswers.forEach(a => scriptAnswerSet.removeScriptAnswer(a.getId()));
    expect(scriptAnswerSet.getAll().length).toBe(0);
  });

  // ----------------------------------------------------------
  // 1) Recuperar todas as respostas cadastradas
  // ----------------------------------------------------------

  test('GET /api/scriptanswers → returns all registered answers', async () => {
    scriptAnswerSet.addScriptAnswer({ id: '123', scriptId: '1', studentId: 'S1' });
    scriptAnswerSet.addScriptAnswer({ id: '321', scriptId: '2', studentId: 'S2' });
    scriptAnswerSet.addScriptAnswer({ id: '890', scriptId: '3', studentId: 'S3' });

    const res = await request(app).get('/api/scriptanswers/');

    expect(res.status).toBe(200);
    const ids = res.body.map((a: any) => a.id);
    expect(ids).toContain('123');
    expect(ids).toContain('321');
    expect(ids).toContain('890');
  });

  // ----------------------------------------------------------
  // 2) Recuperar respostas quando não há nenhuma cadastrada
  // ----------------------------------------------------------

  test('GET /api/scriptanswers → returns empty list when none exist', async () => {
    const res = await request(app).get('/api/scriptanswers/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // ----------------------------------------------------------
  // 3) Recuperar respostas de um aluno cadastrado
  // ----------------------------------------------------------

  test('GET /api/scriptanswers/student/:studentId → returns answers of a specific student', async () => {
    studentSet.addStudent(new Student('Alice', '15029035478', 'alice@gmail.com'));
    scriptAnswerSet.addScriptAnswer({ id: '40', scriptId: '1', studentId: '15029035478' });
    scriptAnswerSet.addScriptAnswer({ id: '41', scriptId: '2', studentId: '15029035478' });
    scriptAnswerSet.addScriptAnswer({ id: '999', scriptId: 'X', studentId: 'other' });

    const res = await request(app).get('/api/scriptanswers/student/15029035478');

    expect(res.status).toBe(200);
    const ids = res.body.map((a: any) => a.id);
    expect(ids).toEqual(['40', '41']);
  });

  // ----------------------------------------------------------
  // 4) Tentar recuperar respostas de aluno não cadastrado
  // ----------------------------------------------------------

  test('GET /api/scriptanswers/student/:studentId → returns 404 if student not found', async () => {
    const res = await request(app).get('/api/scriptanswers/student/999');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Student not found');
  });

  // ----------------------------------------------------------
  // 5) Recuperar respostas por script ID
  // ----------------------------------------------------------

  test('GET /api/scriptanswers/script/:scriptId → returns answers for a specific script', async () => {
    scriptAnswerSet.addScriptAnswer({ id: '50', scriptId: '1', studentId: 'S1' });
    scriptAnswerSet.addScriptAnswer({ id: '51', scriptId: '1', studentId: 'S2' });
    scriptAnswerSet.addScriptAnswer({ id: '52', scriptId: '2', studentId: 'S3' });

    const res = await request(app).get('/api/scriptanswers/script/1');

    expect(res.status).toBe(200);
    const ids = res.body.map((a: any) => a.id);
    expect(ids).toEqual(['50', '51']);
  });

  // ----------------------------------------------------------
  // 6) Recuperar uma resposta por ID
  // ----------------------------------------------------------

  test('GET /api/scriptanswers/:id → returns a specific script answer', async () => {
    scriptAnswerSet.addScriptAnswer({ id: '60', scriptId: '1', studentId: 'S1', grade: 'MA' });

    const res = await request(app).get('/api/scriptanswers/60');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('60');
    expect(res.body.scriptId).toBe('1');
    expect(res.body.grade).toBe('MA');
  });

  // ----------------------------------------------------------
  // 7) Recuperar resposta inexistente
  // ----------------------------------------------------------

  test('GET /api/scriptanswers/:id → returns 404 for nonexistent answer', async () => {
    const res = await request(app).get('/api/scriptanswers/invalid');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ScriptAnswer not found');
  });

  // ----------------------------------------------------------
  // 8) Recuperar a nota de uma questão existente
  // ----------------------------------------------------------

  test('GET /api/scriptanswers/:id/tasks/:taskId → returns grade for existing task', async () => {
    const answer = scriptAnswerSet.addScriptAnswer({
      id: '70',
      scriptId: '1',
      studentId: 'stu'
    });
    answer.addAnswer(new TaskAnswer('TA1', 't1', 'my answer', 'MA'));

    const res = await request(app).get('/api/scriptanswers/70/tasks/t1');

    expect(res.status).toBe(200);
    expect(res.body.taskId).toBe('t1');
    expect(res.body.grade).toBe('MA');
  });

  // ----------------------------------------------------------
  // 9) Nota de questão inexistente
  // ----------------------------------------------------------

  test('GET /api/scriptanswers/:id/tasks/:taskId → returns 404 for missing task', async () => {
    scriptAnswerSet.addScriptAnswer({
      id: '80',
      scriptId: '1',
      studentId: 'stu'
    });

    const res = await request(app).get('/api/scriptanswers/80/tasks/missing');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Task not found');
  });

  // ----------------------------------------------------------
  // 10) Criar uma nova resposta de script
  // ----------------------------------------------------------

  test('POST /api/scriptanswers → creates a new script answer', async () => {
    scripts.addScript({ id: '1', title: 'Test Script' });
    const res = await request(app)
      .post('/api/scriptanswers/')
      .send({
        id: '90',
        scriptId: '1',
        studentId: 'S1'
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('90');
    expect(res.body.scriptId).toBe('1');
    expect(res.body.student).toBe('S1');
  });

  // ----------------------------------------------------------
  // 11) Atualizar nota de uma questão
  // ----------------------------------------------------------

  test('PUT /api/scriptanswers/:id/tasks/:taskId → updates task grade', async () => {
    const answer = scriptAnswerSet.addScriptAnswer({
      id: '100',
      scriptId: '1',
      studentId: 'S1'
    });
    answer.addAnswer(new TaskAnswer('TA2', 't2', 'answer', 'MPA'));

    const res = await request(app)
      .put('/api/scriptanswers/100/tasks/t2')
      .send({ grade: 'MA' });

    expect(res.status).toBe(200);
    expect(res.body.taskId).toBe('t2');
    expect(res.body.grade).toBe('MA');
  });

  // ----------------------------------------------------------
  // 12) Atualizar nota com valor inválido
  // ----------------------------------------------------------

  test('PUT /api/scriptanswers/:id/tasks/:taskId → returns 400 for invalid grade', async () => {
    const answer = scriptAnswerSet.addScriptAnswer({
      id: '110',
      scriptId: '1',
      studentId: 'S1'
    });
    answer.addAnswer(new TaskAnswer('TA3', 't3', 'answer'));

    const res = await request(app)
      .put('/api/scriptanswers/110/tasks/t3')
      .send({ grade: 'INVALID' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid grade');
  });

  // ----------------------------------------------------------
  // 13) Adicionar comentário a uma questão
  // ----------------------------------------------------------

  test('PUT /api/scriptanswers/:id/tasks/:taskId/comments → adds comment to task', async () => {
    const answer = scriptAnswerSet.addScriptAnswer({
      id: '120',
      scriptId: '1',
      studentId: 'S1'
    });
    answer.addAnswer(new TaskAnswer('TA4', 't4', 'answer'));

    const res = await request(app)
      .put('/api/scriptanswers/120/tasks/t4/comments')
      .send({ comment: 'Good work!' });

    expect(res.status).toBe(200);
    expect(res.body.taskId).toBe('t4');
    expect(res.body.comment).toBe('Good work!');
  });

  // ----------------------------------------------------------
  // 14) Deletar resposta existente
  // ----------------------------------------------------------

  test('DELETE /api/scriptanswers/:id → deletes existing script answer', async () => {
    scriptAnswerSet.addScriptAnswer({ id: '130', scriptId: '1', studentId: 'S1' });
    expect(scriptAnswerSet.getAll().length).toBe(1);

    const res = await request(app).delete('/api/scriptanswers/130');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('ScriptAnswer deleted successfully');
    expect(res.body.id).toBe('130');
    expect(scriptAnswerSet.getAll().length).toBe(0);
  });

  // ----------------------------------------------------------
  // 15) Tentar deletar resposta inexistente
  // ----------------------------------------------------------

  test('DELETE /api/scriptanswers/:id → returns 404 when deleting nonexistent answer', async () => {
    const res = await request(app).delete('/api/scriptanswers/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('ScriptAnswer not found');
  });

  // ----------------------------------------------------------
  // 16) Deletar todas as respostas
  // ----------------------------------------------------------

  test('DELETE /api/scriptanswers → deletes all script answers', async () => {
    scriptAnswerSet.addScriptAnswer({ id: '140', scriptId: '1', studentId: 'S1' });
    scriptAnswerSet.addScriptAnswer({ id: '141', scriptId: '2', studentId: 'S2' });
    scriptAnswerSet.addScriptAnswer({ id: '142', scriptId: '3', studentId: 'S3' });
    expect(scriptAnswerSet.getAll().length).toBe(3);

    const res = await request(app).delete('/api/scriptanswers/');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('All script answers deleted');
    expect(res.body.count).toBe(3);
    expect(scriptAnswerSet.getAll().length).toBe(0);
  });

  // ----------------------------------------------------------
  // 17) Deletar todas as respostas quando não há nenhuma
  // ----------------------------------------------------------

  test('DELETE /api/scriptanswers → returns 200 even when no answers exist', async () => {
    expect(scriptAnswerSet.getAll().length).toBe(0);

    const res = await request(app).delete('/api/scriptanswers/');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('All script answers deleted');
    expect(res.body.count).toBe(0);
  });
});
