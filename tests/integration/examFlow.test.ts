import request from 'supertest';
import app from '../../server/src/server';
import * as dataService from '../../server/src/services/dataService';

jest.mock('../../server/src/services/dataService');

describe('Integration Test: Exam ZIP Flow', () => {
    
    const mockExam = {
        id: 100,
        title: 'Prova Integração',
        classId: 'turma-int',
        openQuestions: 1,
        closedQuestions: 0,
        questions: [1]
    };

    const mockQuestion = { 
        id: 1, 
        question: 'Q1', 
        type: 'open', 
        topic: 'Test' 
    };

    beforeAll(() => {
        (dataService.getExamsForClass as jest.Mock).mockReturnValue([mockExam]);
        
        Object.defineProperty(dataService, 'questions', { get: () => [mockQuestion], configurable: true });
        
        (dataService.addExamGeneration as jest.Mock).mockImplementation(() => {});
    });

    it('should integrate Router, Controller and Service to generate ZIP and save history', async () => {
        const response = await request(app)
            .get('/api/exams/100/zip')
            .query({ classId: 'turma-int', quantity: 1 });

        expect(response.status).toBe(200);
        expect(response.header['content-type']).toContain('application/zip');

        expect(dataService.addExamGeneration).toHaveBeenCalledTimes(1);
        
        const saveCallArgs = (dataService.addExamGeneration as jest.Mock).mock.calls[0][0];
        expect(saveCallArgs.examId).toBe(100);
        expect(saveCallArgs.versions).toHaveLength(1);
    });
});