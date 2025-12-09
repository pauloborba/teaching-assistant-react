import { responses, updateResponseAnswerScore } from '../../src/services/dataService';

describe('updateResponseAnswerScore', () => {
  beforeEach(() => {
    responses.length = 0;
  });

  it('atualiza grade e mantém a resposta', () => {
    responses.push({
      id: 1,
      studentCPF: '1',
      examId: 10,
      answers: [{ questionId: 5, answer: 'texto', grade: 0 }],
      timestamp: new Date().toISOString(),
    });

    const ok = updateResponseAnswerScore(1, 5, 90);
    expect(ok).toBe(true);
    expect(responses[0].answers[0].grade).toBe(90);
    expect(responses[0].answers[0].answer).toBe('texto');
  });

  it('faz clamp entre 0 e 100', () => {
    responses.push({
      id: 2,
      studentCPF: '2',
      examId: 11,
      answers: [{ questionId: 7, answer: 't', grade: 0 }],
      timestamp: new Date().toISOString(),
    });
    updateResponseAnswerScore(2, 7, 150);
    expect(responses[0].answers[0].grade).toBe(100);
    updateResponseAnswerScore(2, 7, -10);
    expect(responses[0].answers[0].grade).toBe(0);
  });

  it('retorna false se response ou answer não existirem', () => {
    const result = updateResponseAnswerScore(999, 1, 50);
    expect(result).toBe(false);
  });
});

