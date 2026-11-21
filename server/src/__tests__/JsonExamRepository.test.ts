
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { Exam } from '../models/Exam';
import { ExamBank } from '../models/ExamBank';
import { Question } from '../models/Question';
import { QuestionBank } from '../models/QuestionBank';
import { JsonExamRepository } from '../persistence/JsonExamRepository';

// Cria um banco de questões com dados conhecidos.
// Os códigos fixos facilitam a simulação de um reinício.
function createQuestionBank(): QuestionBank {
  const bank = new QuestionBank();

  bank.addQuestion(new Question(
    'Git',
    'Qual comando une branches?',
    [
      { text: 'merge', isTrue: true },
      { text: 'log', isTrue: false }
    ],
    'q-git'
  ));

  bank.addQuestion(new Question(
    'Testes',
    'Qual ferramenta pode automatizar testes de GUI?',
    [
      { text: 'Cypress', isTrue: true },
      { text: 'Git', isTrue: false }
    ],
    'q-testes'
  ));

  return bank;
}

describe('JsonExamRepository', () => {
  let directory: string;
  let filePath: string;
  let repository: JsonExamRepository;

  beforeEach(() => {
    directory = fs.mkdtempSync(
      path.join(os.tmpdir(), 'exams-test-')
    );

    filePath = path.join(directory, 'data', 'exams.json');
    repository = new JsonExamRepository(filePath);
  });

  afterEach(() => {
    fs.rmSync(directory, {
      recursive: true,
      force: true
    });
  });

  test('não falha se o arquivo ainda não existe', () => {
    const examBank = new ExamBank(createQuestionBank());

    repository.load(examBank);

    expect(examBank.getAllExams()).toHaveLength(0);
  });

  test('salva provas em JSON', () => {
    const examBank = new ExamBank(createQuestionBank());

    const exam = examBank.addExam(new Exam(
      'Prova de Git',
      ['q-git']
    ));

    repository.save(examBank);

    const content = JSON.parse(
      fs.readFileSync(filePath, 'utf8')
    );

    expect(content.exams).toHaveLength(1);
    expect(content.exams[0]).toEqual(exam.toJSON());
  });

  test('recupera provas preservando códigos e questões', () => {
    const originalBank = new ExamBank(createQuestionBank());

    const originalExam = originalBank.addExam(new Exam(
      'Prova de Engenharia de Software',
      ['q-testes', 'q-git']
    ));

    repository.save(originalBank);

    // Simula um servidor reiniciado:
    // as questões são recriadas com os mesmos códigos.
    const restoredQuestionBank = createQuestionBank();
    const restoredExamBank = new ExamBank(restoredQuestionBank);

    repository.load(restoredExamBank);

    expect(restoredExamBank.getAllExams()).toHaveLength(1);

    const restoredExam = restoredExamBank.getAllExams()[0];

    expect(restoredExam.toJSON()).toEqual(
      originalExam.toJSON()
    );

    expect(restoredExamBank.getQuestionsForExam(
      restoredExam.code
    ).map(question => question.code)).toEqual([
      'q-testes',
      'q-git'
    ]);

    expect(restoredExamBank.getSubjectsForExam(
      restoredExam.code
    )).toEqual([
      'Testes',
      'Git'
    ]);
  });

  test('mantém a validação de nomes duplicados após recuperar', () => {
    const originalBank = new ExamBank(createQuestionBank());

    originalBank.addExam(new Exam(
      'Prova de Git',
      ['q-git']
    ));

    repository.save(originalBank);

    const restoredBank = new ExamBank(createQuestionBank());
    repository.load(restoredBank);

    expect(() => restoredBank.addExam(new Exam(
      'Prova de Git',
      ['q-testes']
    ))).toThrow('Já existe uma prova com esse nome');
  });

  test('rejeita prova que referencia questão inexistente', () => {
    fs.mkdirSync(path.dirname(filePath), {
      recursive: true
    });

    fs.writeFileSync(filePath, JSON.stringify({
      exams: [
        {
          code: 'exam-invalido',
          name: 'Prova inválida',
          questionCodes: ['q-inexistente']
        }
      ]
    }));

    const examBank = new ExamBank(createQuestionBank());

    expect(() => repository.load(examBank)).toThrow(
      'Questão q-inexistente não encontrada'
    );
  });

  test('rejeita um arquivo JSON inválido', () => {
    fs.mkdirSync(path.dirname(filePath), {
      recursive: true
    });

    fs.writeFileSync(filePath, '{ json invalido');

    const examBank = new ExamBank(createQuestionBank());

    expect(() => repository.load(examBank)).toThrow();

    expect(examBank.getAllExams()).toHaveLength(0);
  });
});
