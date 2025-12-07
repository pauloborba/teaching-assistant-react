import request from 'supertest';
import app from '../../server/src/server'; 
import * as dataService from '../../server/src/services/dataService';

jest.mock('../../server/src/services/dataService');

describe('Service Tests: Exam Generation Routes', () => {
    
    const mockExam = {
        id: 100,
        title: 'Prova de Teste',
        classId: 'turma-A',
        openQuestions: 1,
        closedQuestions: 1,
        questions: [1, 2]
    };

    const mockQuestions = [
        { id: 1, question: 'Q1', type: 'open', topic: 'T1' },
        { id: 2, question: 'Q2', type: 'closed', topic: 'T1', options: [{id: 1, option: 'A', isCorrect: true}] }
    ];

    beforeEach(() => {
        jest.clearAllMocks();

        (dataService.getExamsForClass as jest.Mock).mockReturnValue([mockExam]);
        (dataService.addExamGeneration as jest.Mock).mockImplementation(() => {});
        
        Object.defineProperty(dataService, 'questions', { 
            get: () => mockQuestions, 
            configurable: true 
        });
    });

    it('should generate a ZIP file and save history when valid parameters are provided', async () => {
        const response = await request(app)
            .get('/api/exams/100/zip')
            .query({ classId: 'turma-A', quantity: 2 });

        expect(response.status).toBe(200);
        expect(response.header['content-type']).toContain('application/zip');
        expect(response.header['content-disposition']).toContain('attachment; filename="Lote_Prova de Teste.zip"');

        expect(dataService.addExamGeneration).toHaveBeenCalledTimes(1);
        
        const savedData = (dataService.addExamGeneration as jest.Mock).mock.calls[0][0];
        expect(savedData.examId).toBe(100);
        expect(savedData.versions).toHaveLength(2); 
    });

    it('should return 400 Bad Request if classId is missing', async () => {
        const response = await request(app)
            .get('/api/exams/100/zip')
            .query({ quantity: 5 }); 

        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'classId é obrigatório.' });
        
        expect(dataService.addExamGeneration).not.toHaveBeenCalled();
    });

    it('should retrieve generation history sorted by date', async () => {
        const mockHistory = [
            { id: 'gen-old', timestamp: '2023-01-01' },
            { id: 'gen-new', timestamp: '2025-01-01' }
        ];
        (dataService.getGenerationsForExam as jest.Mock).mockReturnValue(mockHistory);

        const response = await request(app)
            .get('/api/exams/100/generations')
            .query({ classId: 'turma-A' });

        expect(response.status).toBe(200);
        expect(response.body).toHaveLength(2);
        expect(response.body[0].id).toBe('gen-new'); 
    });
});