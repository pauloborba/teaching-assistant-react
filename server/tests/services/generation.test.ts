import { 
  getGenerationsForExam, 
  addExamGeneration, 
  examGenerations, 
  ExamGenerationRecord 
} from '../../src/services/dataService';

describe('Unit Test: Exam Generation History', () => {
    
    beforeEach(() => {
        examGenerations.length = 0;
    });

    it('should return only generations matching examId and classId', () => {
        const targetRecord: ExamGenerationRecord = {
            id: 'gen-1',
            examId: 100,
            classId: 'turma-A',
            timestamp: new Date().toISOString(),
            description: 'Target',
            versions: []
        };

        const wrongClassRecord: ExamGenerationRecord = {
            id: 'gen-2',
            examId: 100,
            classId: 'turma-B', 
            timestamp: new Date().toISOString(),
            description: 'Noise Class',
            versions: []
        };

        const wrongExamRecord: ExamGenerationRecord = {
            id: 'gen-3',
            examId: 200,
            classId: 'turma-A',
            timestamp: new Date().toISOString(),
            description: 'Noise Exam',
            versions: []
        };

        addExamGeneration(targetRecord);
        addExamGeneration(wrongClassRecord);
        addExamGeneration(wrongExamRecord);

        const result = getGenerationsForExam(100, 'turma-A');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('gen-1'); 
        expect(result[0].description).toBe('Target');
    });

    it('should return empty list if no match found', () => {
        const result = getGenerationsForExam(999, 'turma-fantasma');
        expect(result).toHaveLength(0);
        expect(result).toEqual([]);
    });
});