import request from 'supertest';
import app from '../../src/server';
import { 
    examsManager, 
    questionsManager, 
    examGenerations
} from '../../src/services/dataService';
import * as dataService from '../../src/services/dataService';


describe('Integration Test: Exam ZIP Flow', () => {
    beforeAll(() => {
        jest.spyOn(dataService, 'triggerSave').mockImplementation(() => {});
        jest.spyOn(dataService, 'triggerSaveExams').mockImplementation(() => {});
        jest.spyOn(dataService, 'triggerSaveQuestions').mockImplementation(() => {});
        jest.spyOn(dataService, 'triggerSaveGenerations').mockImplementation(() => {});
        jest.spyOn(dataService, 'triggerSaveStudentsExams').mockImplementation(() => {});
    });

    beforeEach(() => {
        examsManager.replaceAll([]);
        questionsManager.replaceAll([]);
        examGenerations.length = 0;
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    it('should successfully generate ZIP and persist history using REAL service logic', async () => {
        const question = questionsManager.addQuestion({
            question: 'Questão de Integração',
            topic: 'Integration',
            type: 'open',
            answer: 'Resposta'
        });

        examsManager.addExam({
            id: 200,
            classId: 'turma-real',
            title: 'Prova Real de Integração',
            openQuestions: 1,
            closedQuestions: 0,
            isValid: true,
            questions: [question.id]
        });

        const response = await request(app)
            .get('/api/exams/200/zip')
            .query({ classId: 'turma-real', quantity: 1 });

        expect(response.status).toBe(200);
        expect(response.header['content-type']).toContain('application/zip');

        expect(examGenerations).toHaveLength(1);
        
        const generationRecord = examGenerations[0];
        expect(generationRecord.examId).toBe(200);
        expect(generationRecord.classId).toBe('turma-real');
        
        expect(generationRecord.versions).toHaveLength(1);
        expect(generationRecord.versions[0].questions[0].questionId).toBe(question.id);
    });

    it('should return 404 using REAL lookup logic when exam does not exist', async () => {        
        const response = await request(app)
            .get('/api/exams/999/zip')
            .query({ classId: 'turma-real', quantity: 1 });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Prova não encontrada.');
        
        expect(examGenerations).toHaveLength(0);
    });
});