import { getOpenQuestionsForExam, examsManager, questionsManager } from '../../src/services/dataService';
import { QuestionRecord } from '../../src/models/Questions';
import { ExamRecord } from '../../src/models/Exams';

describe('getOpenQuestionsForExam', () => {
  beforeEach(() => {
    examsManager.replaceAll([]);
    questionsManager.replaceAll([]);
  });

  it('deve retornar apenas questões abertas de um exame', () => {
    // Arrange
    const openQuestion: QuestionRecord = {
      id: 1,
      question: 'O que é TDD?',
      topic: 'Desenvolvimento',
      type: 'open',
      answer: 'Test-Driven Development'
    };

    const closedQuestion: QuestionRecord = {
      id: 2,
      question: 'Qual é a resposta correta?',
      topic: 'Testes',
      type: 'closed',
      options: [
        { id: 1, option: 'Opção A', isCorrect: true },
        { id: 2, option: 'Opção B', isCorrect: false }
      ]
    };

    questionsManager.replaceAll([openQuestion, closedQuestion]);

    const exam: ExamRecord = {
      id: 1,
      classId: 'class1',
      title: 'Exame de Testes',
      isValid: true,
      openQuestions: 1,
      closedQuestions: 1,
      questions: [1, 2]
    };

    examsManager.addExam(exam);

    // Act
    const result = getOpenQuestionsForExam(1);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].type).toBe('open');
  });

  it('deve retornar array vazio quando o exame não existe', () => {
    const result = getOpenQuestionsForExam(999);
    expect(result).toEqual([]);
  });
});

