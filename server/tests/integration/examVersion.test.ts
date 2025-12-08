import request from 'supertest';
import app from '../../src/server';
import * as dataService from '../../src/services/dataService';

jest.mock('../../src/services/dataService');

describe('Integration Test: Get Exam Version', () => {

    // Mock data
    const mockExamId = 200;
    const mockClassId = 'turma-version-test';
    const mockVersionNumber = 1;

    const mockGeneration = {
        id: 'gen-123',
        examId: mockExamId,
        classId: mockClassId,
        timestamp: new Date().toISOString(),
        description: 'Test Generation',
        versions: [
            {
                versionNumber: 1,
                questions: [
                    {
                        numero: 1,
                        questionId: 10,
                        type: 'open',
                        rightAnswer: 'Resit' // Typo intentional to check data fidelity
                    },
                    {
                        numero: 2,
                        questionId: 11,
                        type: 'closed',
                        rightAnswer: 'A'
                    }
                ]
            },
            {
                versionNumber: 2,
                questions: []
            }
        ]
    };

    beforeAll(() => {
        // Mock getGenerationsForExam to return our mock generation
        (dataService.getGenerationsForExam as jest.Mock).mockReturnValue([mockGeneration]);
    });

    it('should return the correct version and questions', async () => {
        const response = await request(app)
            .get(`/api/exams/${mockExamId}/versions/${mockVersionNumber}`)
            .query({ classId: mockClassId });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            versionNumber: 1,
            questions: mockGeneration.versions[0].questions
        });
    });

    it('should return 404 if version does not exist', async () => {
        const response = await request(app)
            .get(`/api/exams/${mockExamId}/versions/999`)
            .query({ classId: mockClassId });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
    });

    it('should return 400 if classId is missing', async () => {
        const response = await request(app)
            .get(`/api/exams/${mockExamId}/versions/${mockVersionNumber}`);

        expect(response.status).toBe(400);
    });
});
