import { jest } from '@jest/globals';

// Mock fs and path BEFORE importing the model
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args) => args[args.length - 1]),
  resolve: jest.fn((...args) => args[args.length - 1]),
}));

import * as fs from 'fs';
import { Correction } from '../../src/models/Correction';

describe('Unit: Correction - closed questions logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.readFileSync as jest.Mock).mockImplementation((...args: any[]) => {
      const filePath = String(args[0]);
      // default no files
      return '{}';
    });
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  });

  it('treats missing answers as zero (student answered subset of questions)', () => {
    // Arrange: exam has 3 closed questions, student answered only 1 correctly
    (fs.readFileSync as jest.Mock).mockImplementation((...args: any[]) => {
      const filePath = String(args[0]);
      if (filePath.includes('exams.json')) {
        return JSON.stringify({ exams: [{ id: 10, questions: [1, 2, 3] }] });
      }
      if (filePath.includes('questions.json')) {
        return JSON.stringify({ questions: [
          { id: 1, type: 'closed', options: [{ id: 1, isCorrect: true }] },
          { id: 2, type: 'closed', options: [{ id: 1, isCorrect: true }] },
          { id: 3, type: 'closed', options: [{ id: 1, isCorrect: true }] },
        ] });
      }
      if (filePath.includes('responses.json')) {
        return JSON.stringify({ responses: [
          { id: 1, studentCPF: '000', examId: 10, answers: [ { questionId: 1, answer: '1' } ] }
        ] });
      }
      return '{}';
    });

    // Act
    const out = Correction.correctExam(10);

    // Assert: student answered 1 out of 3 correct -> final grade ~33.3
    expect(out).toBeDefined();
    expect(out.examId).toBe(10);
    expect(out.correctedCount).toBe(1);
    expect(out.results[0].finalGrade).toBeCloseTo(33.3, 1);
  });

  it('calculates partial credit for questions with multiple correct options', () => {
    (fs.readFileSync as jest.Mock).mockImplementation((...args: any[]) => {
      const filePath = String(args[0]);
      if (filePath.includes('exams.json')) {
        return JSON.stringify({ exams: [{ id: 11, questions: [5] }] });
      }
      if (filePath.includes('questions.json')) {
        return JSON.stringify({ questions: [
          { id: 5, type: 'closed', options: [ { id: 1, isCorrect: true }, { id: 2, isCorrect: true } ] }
        ] });
      }
      if (filePath.includes('responses.json')) {
        return JSON.stringify({ responses: [
          { id: 2, studentCPF: '111', examId: 11, answers: [ { questionId: 5, answer: '1' } ] }
        ] });
      }
      return '{}';
    });

    const out = Correction.correctExam(11);

    // Student selected 1 of 2 correct options -> question grade 50, final 50
    expect(out.results[0].finalGrade).toBe(50);
  });

  it('getAnswersForExam returns empty list when no responses present', () => {
    (fs.readFileSync as jest.Mock).mockImplementation((...args: any[]) => {
      const filePath = String(args[0]);
      if (filePath.includes('responses.json')) return JSON.stringify({ responses: [] });
      return JSON.stringify({ exams: [], questions: [] });
    });

    const grades = Correction.getAnswersForExam(999);
    expect(Array.isArray(grades)).toBe(true);
    expect(grades).toHaveLength(0);
  });

  it('correctExam throws when exam not found', () => {
    (fs.readFileSync as jest.Mock).mockImplementation((...args: any[]) => {
      const filePath = String(args[0]);
      if (filePath.includes('exams.json')) return JSON.stringify({ exams: [] });
      return JSON.stringify({ questions: [], responses: [] });
    });

    expect(() => Correction.correctExam(12345)).toThrow('Exam not found');
  });
});
