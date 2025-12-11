import { responses, updateResponseAnswerScore } from '../../src/services/dataService';

describe('updateResponseAnswerScore', () => {
  beforeEach(() => {
    responses.length = 0;
  });

  it('atualiza grade mantendo resposta e faz clamp entre 0-100', () => {
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

    // Testa clamp
    updateResponseAnswerScore(1, 5, 150);
    expect(responses[0].answers[0].grade).toBe(100);
    updateResponseAnswerScore(1, 5, -10);
    expect(responses[0].answers[0].grade).toBe(0);

    // Testa não encontrado
    expect(updateResponseAnswerScore(999, 1, 50)).toBe(false);
  });
});

