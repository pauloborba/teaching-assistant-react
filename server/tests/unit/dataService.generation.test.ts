import { 
    getNextGenerationId, 
    addExamGeneration, 
    ExamGenerationRecord 
} from '../../src/services/dataService';

jest.mock('fs', () => ({
    existsSync: jest.fn(() => true),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
    readFileSync: jest.fn(() => '[]'),
}));

describe('Unit Test: DataService - Generation IDs', () => {

    it('deve retornar "1" se não houver gerações anteriores (ou se for o primeiro ID detectado)', () => {
        const id = getNextGenerationId();
        
        expect(id).toMatch(/^\d+$/);
        expect(parseInt(id)).toBeGreaterThan(0);
    });

    it('deve incrementar corretamente o ID baseado no maior ID existente', () => {
        const highId = 999;
        const fakeGeneration: ExamGenerationRecord = {
            id: highId.toString(),
            examId: 1,
            classId: 'TEST-CLASS',
            timestamp: new Date().toISOString(),
            description: 'Unit Test Generation',
            versions: []
        };

        addExamGeneration(fakeGeneration);

        const nextId = getNextGenerationId();

        expect(nextId).toBe("1000");
    });

    it('deve lidar com IDs fora de ordem e ainda assim pegar o maior', () => {
        const ids = [50, 20, 10];
        
        ids.forEach(id => {
            addExamGeneration({
                id: id.toString(),
                examId: 1,
                classId: 'TEST-CLASS',
                timestamp: new Date().toISOString(),
                description: 'Chaos Test',
                versions: []
            });
        });

        const nextId = getNextGenerationId();
        expect(nextId).toBe("1000"); 
    });
});