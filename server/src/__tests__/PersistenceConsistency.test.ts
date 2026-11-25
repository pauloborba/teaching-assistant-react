import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import request from 'supertest';
import { createApp } from '../app';
import { StudentSet } from '../models/StudentSet';
import { Classes } from '../models/Classes';
import { Question } from '../models/Question';
import { QuestionBank } from '../models/QuestionBank';
import { Exam } from '../models/Exam';
import { ExamBank } from '../models/ExamBank';
import { InMemoryOnlyRepository } from '../persistence/AppStateRepository';
import { JsonQuestionRepository } from '../persistence/JsonQuestionRepository';
import { JsonExamRepository } from '../persistence/JsonExamRepository';
import { atomicWriteJson } from '../persistence/atomicWriteJson';

const alternatives = [
    { text: 'merge', isTrue: true },
    { text: 'log', isTrue: false }
];

describe('Consistência da persistência', () => {
    let directory: string;

    beforeEach(() => {
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'persistence-test-'));
    });

    afterEach(() => {
        jest.restoreAllMocks();
        fs.rmSync(directory, { recursive: true, force: true });
    });

    function setup() {
        const questionFile = path.join(directory, 'questions.json');
        const examFile = path.join(directory, 'exams.json');
        const questionBank = new QuestionBank();
        const originalQuestion = questionBank.addQuestion(new Question(
            'Git', 'Qual comando une branches?', alternatives
        ));
        const examBank = new ExamBank(questionBank);
        const originalExam = examBank.addExam(new Exam(
            'Prova original', [originalQuestion.code]
        ));
        const questionRepository = new JsonQuestionRepository(questionFile);
        const examRepository = new JsonExamRepository(examFile);
        questionRepository.save(questionBank);
        examRepository.save(examBank);

        const app = createApp({
            students: new StudentSet(),
            classes: new Classes(),
            repository: new InMemoryOnlyRepository(),
            questionBank,
            examBank,
            onQuestionsChanged: () => questionRepository.save(questionBank),
            onExamsChanged: () => examRepository.save(examBank)
        });
        return { app, questionFile, examFile, originalQuestion, originalExam };
    }

    function failNextRename() {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(fs, 'renameSync').mockImplementationOnce(() => {
            throw new Error('Falha de gravação simulada');
        });
    }

    test('falha ao gravar questão preserva disco e memória e permite tentar novamente', async () => {
        const { app, questionFile, originalQuestion } = setup();
        const previousContent = fs.readFileSync(questionFile, 'utf8');
        const payload = {
            subject: 'Git',
            statement: 'Outra questão sobre Git',
            alternatives
        };
        failNextRename();

        await request(app).post('/api/questions').send(payload).expect(500);
        const list = await request(app).get('/api/questions').expect(200);
        expect(list.body).toEqual([originalQuestion.toJSON()]);
        expect(fs.readFileSync(questionFile, 'utf8')).toBe(previousContent);
        expect(fs.readdirSync(directory).sort()).toEqual(['exams.json', 'questions.json']);

        const created = await request(app).post('/api/questions').send(payload).expect(201);
        const finalList = await request(app).get('/api/questions').expect(200);
        expect(finalList.body).toEqual([originalQuestion.toJSON(), created.body]);
        expect(JSON.parse(fs.readFileSync(questionFile, 'utf8')).questions).toEqual(finalList.body);
    });

    test('falha ao gravar prova preserva disco e memória e permite tentar novamente', async () => {
        const { app, examFile, originalQuestion, originalExam } = setup();
        const previousContent = fs.readFileSync(examFile, 'utf8');
        const payload = { name: 'Outra prova', questionCodes: [originalQuestion.code] };
        failNextRename();

        await request(app).post('/api/exams').send(payload).expect(500);
        const list = await request(app).get('/api/exams').expect(200);
        expect(list.body).toEqual([originalExam.toJSON()]);
        expect(fs.readFileSync(examFile, 'utf8')).toBe(previousContent);
        expect(fs.readdirSync(directory).sort()).toEqual(['exams.json', 'questions.json']);

        const created = await request(app).post('/api/exams').send(payload).expect(201);
        const finalList = await request(app).get('/api/exams').expect(200);
        expect(finalList.body).toEqual([originalExam.toJSON(), created.body]);
        expect(JSON.parse(fs.readFileSync(examFile, 'utf8')).exams).toEqual(finalList.body);
    });

    test('cria e substitui um JSON sem deixar arquivos temporários', () => {
        const file = path.join(directory, 'data', 'state.json');
        atomicWriteJson(file, { values: [1] });
        expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ values: [1] });
        atomicWriteJson(file, { values: [1, 2] });
        expect(JSON.parse(fs.readFileSync(file, 'utf8'))).toEqual({ values: [1, 2] });
        expect(fs.readdirSync(path.dirname(file))).toEqual(['state.json']);
    });

    test('falha na primeira gravação não deixa JSON nem arquivo temporário', () => {
        const file = path.join(directory, 'state.json');
        failNextRename();
        expect(() => atomicWriteJson(file, { values: [1] })).toThrow('Falha de gravação simulada');
        expect(fs.existsSync(file)).toBe(false);
        expect(fs.readdirSync(directory)).toEqual([]);
    });
});
