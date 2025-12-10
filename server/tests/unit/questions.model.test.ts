import { Questions } from '../../src/models/Questions';

describe('Unit: Questions model', () => {
  it('adds open questions with trimmed text and sequential ids', () => {
    const model = new Questions();

    const added = model.addQuestion({
      question: '  Qual é o ciclo do TDD?  ',
      topic: ' Testes ',
      type: 'open',
      answer: '  Red, Green, Refactor '
    });

    expect(added.id).toBe(1);
    expect(added.question).toBe('Qual é o ciclo do TDD?');
    expect(added.topic).toBe('Testes');
    expect(added.answer).toBe('Red, Green, Refactor');

    const second = model.addQuestion({
      question: 'Explique o objetivo do TDD',
      topic: 'Testes',
      type: 'open',
      answer: 'Guiar o design por testes'
    });

    expect(second.id).toBe(2);
  });

  it('throws when closed questions do not declare a correct option', () => {
    const model = new Questions();

    expect(() =>
      model.addQuestion({
        question: 'Quais são os pilares do XP?',
        topic: 'Metodologias',
        type: 'closed',
        options: [
          { option: 'Comunicação', isCorrect: false },
          { option: 'Coragem', isCorrect: false }
        ]
      })
    ).toThrow('At least one option must be marked as correct');
  });

  it('switches a question from closed to open, clearing options', () => {
    const model = new Questions();

    const closed = model.addQuestion({
      question: 'Selecione a opção correta',
      topic: 'Qualidade',
      type: 'closed',
      options: [
        { option: 'Resposta Certa', isCorrect: true },
        { option: 'Resposta Errada', isCorrect: false }
      ]
    });

    const updated = model.updateQuestion(closed.id, {
      type: 'open',
      answer: 'Resposta discursiva'
    });

    expect(updated).toBeDefined();
    expect(updated?.type).toBe('open');
    expect(updated?.options).toBeUndefined();
    expect(updated?.answer).toBe('Resposta discursiva');
  });
});
