import request from 'supertest';
import { expect, jest, describe, test, beforeEach } from '@jest/globals';
import app from '../../src/server'; // Adjust path if needed, assumed from provs.test.ts

//verifica se o código de roteamento, validação de dados e regras de negócio

// Mocking the dependencies
// We mock the methods exported by dataService that the route uses.
const mockFindClassById = jest.fn();
const mockAddExam = jest.fn();
const mockGetQuestionsByIds = jest.fn();
const mockGetNextExamId = jest.fn();
const mockTriggerSaveExams = jest.fn();

// We need to mock the specific module path
jest.mock('../../src/services/dataService', () => {
    return {
        classes: {
            findClassById: (id: string) => mockFindClassById(id) // Delegate to our mock
        },
        addExam: (exam: any) => mockAddExam(exam),
        getQuestionsByIds: (ids: any) => mockGetQuestionsByIds(ids),
        getNextExamId: () => mockGetNextExamId(),
        triggerSaveExams: () => mockTriggerSaveExams(),
        loadAllData: jest.fn(),
        // Mock other used functions to prevent errors
        getExamById: jest.fn(),
        deleteExam: jest.fn(),
        triggerSaveStudentsExams: jest.fn(),
    };
});

// Wrapper Service to adapt the unit test structure to the integration reality
class ExamService {
    repository: any;

    constructor(repository: any) {
        this.repository = repository;
    }

    async createExam(payload: any) {

        const response = await request(app)
            .post('/api/exams')
            .send(payload)
            .set('Content-Type', 'application/json');

        if (response.status === 201) {
            return response.body.data;
        } else {
            if (response.body.error) {
                const err = response.body.error;
                if (err.includes("not found") || err.includes("não encontrada")) throw new Error("Class not found");

                throw new Error(err);
            }
            throw new Error(`Unexpected status ${response.status}`);
        }
    }
}

// The Mock Repository object required by the original test structure
const mockRepository = {
    create: jest.fn(),
    findClassById: mockFindClassById, // Share the spy
};

const examService = new ExamService(mockRepository);

describe('ExamService - createExam (unit test via simulated integration)', () => {

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetNextExamId.mockReturnValue(10);

        mockGetQuestionsByIds.mockImplementation((ids: any) => {
            return ids.map((id: number) => ({
                id,
                type: id <= 2 ? 'open' : 'closed'
            }));
        });
    });

    test('should create the exam when data is valid', async () => {
        const payload = {
            nomeProva: "Prova 1",
            classId: "Engenharia-2025",
            quantidadeAberta: 2,
            quantidadeFechada: 3,
            questionIds: [1, 2, 3, 4, 5]
        };

        mockFindClassById.mockReturnValue({
            id: "Engenharia-2025",
        });

        const result = await examService.createExam(payload);

        expect(mockFindClassById).toHaveBeenCalledWith("Engenharia-2025");

        // The server calls addExam, so we check that
        expect(mockAddExam).toHaveBeenCalled();

        expect(result.id).toBe(10);
        expect(result.title).toBe("Prova 1");
    });

    test('should reject if a required field is missing', async () => {
        const payload = {
            classId: "Engenharia-2025",
            quantidadeAberta: 2,
            quantidadeFechada: 3,
            questionIds: [1, 2, 3, 4, 5]
        };

        await expect(examService.createExam(payload as any))
            .rejects
            // Server error: "nomeProva is required and must be a string"
            // Expectation matches substring
            .toThrow("nomeProva is required");
    });

    test('should reject if the class does not exist', async () => {
        const payload = {
            nomeProva: "Prova 1",
            classId: "Inexistente",
            quantidadeAberta: 2,
            quantidadeFechada: 3,
            questionIds: [1, 2, 3, 4, 5]
        };

        mockFindClassById.mockReturnValue(null);

        await expect(examService.createExam(payload))
            .rejects
            .toThrow("Class not found");

        expect(mockFindClassById).toHaveBeenCalledWith("Inexistente");
    });
});
