import request from 'supertest';
import { app, studentSet, classes } from '../server';

const CPF = '999.888.777-66';

// Cria turma, aluno e matrícula pela API
async function criarTurmaComAluno(topic: string, year: number, semester: number): Promise<string> {
  const turma = await request(app).post('/api/classes').send({ topic, year, semester });
  await request(app).post(`/api/classes/${turma.body.id}/enroll`).send({ studentCPF: CPF });
  return turma.body.id;
}

function cadastrarResultado(turmaId: string, roteiro: string, dados: any) {
  return request(app)
    .post(`/api/classes/${turmaId}/roteiros/${encodeURIComponent(roteiro)}/respostas`)
    .send({ studentCPF: CPF, ...dados });
}

describe('API do relatório de desempenho do roteiro', () => {
  beforeEach(async () => {
    classes.getAllClasses().forEach(c => classes.removeClass(c.getClassId()));
    studentSet.getAllStudents().forEach(s => studentSet.removeStudent(s.getCPF()));
    await request(app).post('/api/students').send({ name: 'Aluno Teste', cpf: CPF, email: 'aluno@teste.com' });
  });

  describe('POST /api/classes/:classId/roteiros/:titulo/respostas', () => {
    test('cadastra o resultado de um aluno matriculado', async () => {
      const turmaId = await criarTurmaComAluno('ESS', 2026, 2);

      const response = await cadastrarResultado(turmaId, 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ studentCPF: '99988877766', acertos: 8, erros: 2, tempoEntrega: 1 });
    });

    test('aceita o CPF sem pontuação', async () => {
      const turmaId = await criarTurmaComAluno('ESS', 2026, 2);

      const response = await cadastrarResultado(turmaId, 'Roteiro 1', { studentCPF: '99988877766', acertos: 8, erros: 2, tempoEntrega: 1 });

      expect(response.status).toBe(201);
    });

    test('responde 404 para turma que não existe', async () => {
      const response = await cadastrarResultado('ESS-2030-1', 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Class not found');
    });

    test('responde 404 para aluno que não existe', async () => {
      const turmaId = await criarTurmaComAluno('ESS', 2026, 2);

      const response = await cadastrarResultado(turmaId, 'Roteiro 1', { studentCPF: '000.000.000-00', acertos: 8, erros: 2, tempoEntrega: 1 });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Student not found');
    });

    test('responde 400 para aluno que não está matriculado na turma', async () => {
      const turma = await request(app).post('/api/classes').send({ topic: 'ESS', year: 2026, semester: 2 });

      const response = await cadastrarResultado(turma.body.id, 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Student is not enrolled in this class');
    });

    test('responde 400 para valores inválidos', async () => {
      const turmaId = await criarTurmaComAluno('ESS', 2026, 2);

      const negativo = await cadastrarResultado(turmaId, 'Roteiro 1', { acertos: -1, erros: 2, tempoEntrega: 1 });
      const faltando = await cadastrarResultado(turmaId, 'Roteiro 1', { acertos: 8, erros: 2 });
      const texto = await cadastrarResultado(turmaId, 'Roteiro 1', { acertos: 'oito', erros: 2, tempoEntrega: 1 });

      expect([negativo.status, faltando.status, texto.status]).toEqual([400, 400, 400]);
    });

    test('o resultado aparece na lista de turmas', async () => {
      const turmaId = await criarTurmaComAluno('ESS', 2026, 2);
      await cadastrarResultado(turmaId, 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });

      const response = await request(app).get('/api/classes');

      expect(response.body[0].respostasDeRoteiros).toEqual([
        { roteiro: 'Roteiro 1', avaliacoes: [{ studentCPF: '99988877766', acertos: 8, erros: 2, tempoEntrega: 1 }] }
      ]);
    });
  });

  describe('GET e DELETE dos resultados de uma turma', () => {
    test('GET desempenho devolve as médias da turma no roteiro', async () => {
      const turmaId = await criarTurmaComAluno('ESS', 2026, 2);
      await cadastrarResultado(turmaId, 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });

      const response = await request(app).get(`/api/classes/${turmaId}/roteiros/Roteiro%201/desempenho`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ mediaAcertos: 8, mediaErros: 2, mediaTempoEntrega: 1 });
    });

    test('GET desempenho responde 404 quando a turma não tem resultados no roteiro', async () => {
      const turmaId = await criarTurmaComAluno('ESS', 2026, 2);

      const response = await request(app).get(`/api/classes/${turmaId}/roteiros/Roteiro%201/desempenho`);

      expect(response.status).toBe(404);
    });

    test('DELETE apaga os resultados do roteiro', async () => {
      const turmaId = await criarTurmaComAluno('ESS', 2026, 2);
      await cadastrarResultado(turmaId, 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });

      const apagar = await request(app).delete(`/api/classes/${turmaId}/roteiros/Roteiro%201/respostas`);
      const depois = await request(app).get(`/api/classes/${turmaId}/roteiros/Roteiro%201/desempenho`);

      expect(apagar.status).toBe(204);
      expect(depois.status).toBe(404);
    });
  });

  describe('GET /api/relatorio-roteiro', () => {
    let atual: string;
    let passada1: string;
    let passada2: string;

    beforeEach(async () => {
      atual = await criarTurmaComAluno('ESS', 2026, 2);
      passada1 = await criarTurmaComAluno('ESS', 2025, 1);
      passada2 = await criarTurmaComAluno('ESS', 2025, 2);
    });

    test('devolve a turma atual e a média das turmas passadas', async () => {
      await cadastrarResultado(atual, 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });
      await cadastrarResultado(passada1, 'Roteiro 1', { acertos: 6, erros: 4, tempoEntrega: 3 });
      await cadastrarResultado(passada2, 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });

      const response = await request(app).get('/api/relatorio-roteiro')
        .query({ turmaAtual: 'ESS - 2026.2', roteiro: 'Roteiro 1', passadas: ['ESS - 2025.1', 'ESS - 2025.2'] });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([
        { turma: 'ESS - 2026.2', mediaAcertos: 8, mediaErros: 2, mediaTempoEntrega: 1 },
        { turma: 'Média das turmas passadas', mediaAcertos: 7, mediaErros: 3, mediaTempoEntrega: 2 }
      ]);
    });

    test('aceita uma única turma passada', async () => {
      await cadastrarResultado(atual, 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });
      await cadastrarResultado(passada1, 'Roteiro 1', { acertos: 6, erros: 4, tempoEntrega: 3 });

      const response = await request(app).get('/api/relatorio-roteiro')
        .query({ turmaAtual: 'ESS - 2026.2', roteiro: 'Roteiro 1', passadas: 'ESS - 2025.1' });

      expect(response.status).toBe(200);
      expect(response.body[1]).toEqual({ turma: 'Média das turmas passadas', mediaAcertos: 6, mediaErros: 4, mediaTempoEntrega: 3 });
    });

    test('sem turmas passadas responde 400 com a mensagem de erro', async () => {
      await cadastrarResultado(atual, 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });

      const response = await request(app).get('/api/relatorio-roteiro').query({ turmaAtual: 'ESS - 2026.2', roteiro: 'Roteiro 1' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Não é possível fazer essa operação!');
    });

    test('sem turma atual informada responde 400 com a mensagem de erro', async () => {
      await cadastrarResultado(passada1, 'Roteiro 1', { acertos: 6, erros: 4, tempoEntrega: 3 });

      const response = await request(app).get('/api/relatorio-roteiro').query({ roteiro: 'Roteiro 1', passadas: 'ESS - 2025.1' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Não é possível fazer essa operação!');
    });

    test('turma passada inexistente responde 400 com a mensagem de erro', async () => {
      await cadastrarResultado(atual, 'Roteiro 1', { acertos: 8, erros: 2, tempoEntrega: 1 });

      const response = await request(app).get('/api/relatorio-roteiro')
        .query({ turmaAtual: 'ESS - 2026.2', roteiro: 'Roteiro 1', passadas: 'ESS - 2019.1' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Não é possível fazer essa operação!');
    });

    test('turma atual sem resultados devolve só a média das passadas', async () => {
      await cadastrarResultado(passada1, 'Roteiro 1', { acertos: 6, erros: 4, tempoEntrega: 3 });

      const response = await request(app).get('/api/relatorio-roteiro')
        .query({ turmaAtual: 'ESS - 2026.2', roteiro: 'Roteiro 1', passadas: 'ESS - 2025.1' });

      expect(response.status).toBe(200);
      expect(response.body.map((l: any) => l.turma)).toEqual(['Média das turmas passadas']);
    });
  });
});
