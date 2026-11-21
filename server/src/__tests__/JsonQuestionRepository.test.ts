
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Question } from '../models/Question';
import { QuestionBank } from '../models/QuestionBank';
import { JsonQuestionRepository } from '../persistence/JsonQuestionRepository';

describe('JsonQuestionRepository', () => {
  let directory: string;
  let filePath: string;
  let repository: JsonQuestionRepository;

  beforeEach(() => {
    directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'questions-test-')
    );

    filePath = path.join(directory, 'data', 'questions.json');
    repository = new JsonQuestionRepository(filePath);
  });

  afterEach(() => {
    fs.rmSync(directory, {
      recursive: true,
      force: true
    });
  });

  test('não falha se o arquivo ainda não existe', () => {
    const bank = new QuestionBank();

    repository.load(bank);

    expect(bank.getAllQuestions()).toHaveLength(0);
  });

  test('salva as questões em JSON', () => {
    const bank = new QuestionBank();

    bank.addQuestion(new Question(
      'Git',
      'Qual comando une branches?',
      [
        { text: 'merge', isTrue: true },
        { text: 'log', isTrue: false }
      ]
    ));

    repository.save(bank);

    const content = JSON.parse(
      fs.readFileSync(filePath, 'utf8')
    );

    expect(content.questions).toHaveLength(1);
    expect(content.questions[0].subject).toBe('Git');
    expect(content.questions[0].code).toEqual(
      expect.any(String)
    );
  });

  test('recupera as questões preservando os códigos', () => {
    const originalBank = new QuestionBank();

    const question = originalBank.addQuestion(new Question(
      'Git',
      'Qual comando une branches?',
      [
        { text: 'merge', isTrue: true },
        { text: 'log', isTrue: false }
      ]
    ));

    repository.save(originalBank);

    // Simula uma nova inicialização
    const restoredBank = new QuestionBank();

    repository.load(restoredBank);

    expect(restoredBank.getAllQuestions()).toHaveLength(1);

    const restoredQuestion = restoredBank.getAllQuestions()[0];

    expect(restoredQuestion.code).toBe(question.code);
    expect(restoredQuestion.toJSON()).toEqual(
      question.toJSON()
    );
  });

  test('rejeita um arquivo JSON inválido', () => {
    fs.mkdirSync(path.dirname(filePath), {
      recursive: true
    });

    fs.writeFileSync(filePath, '{ arquivo invalido');

    const bank = new QuestionBank();

    expect(() => repository.load(bank)).toThrow();
    expect(bank.getAllQuestions()).toHaveLength(0);
  });
});
