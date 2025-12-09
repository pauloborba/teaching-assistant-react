import * as fs from 'fs';
import * as path from 'path';

// Mock ANTES de qualquer outra importação
jest.mock('fs');
jest.mock('path', () => ({
  join: jest.fn((...args) => args[args.length - 1]),
  resolve: jest.fn((...args) => args[args.length - 1]),
}));

// Agora importa Correction DEPOIS dos mocks
import { Correction } from '../../src/models/Correction';
import { studentSet } from '../../src/services/dataService';
import { Student } from '../../src/models/Student';

describe('Autocorrection Service - Closed Questions', () => {
  const mockExamsPath = '../../data/exams.json';
  const mockQuestionsPath = '../../data/questions.json';
  const mockResponsesPath = '../../data/responses.json';

  // Helper to create mock data structures
  const createMockExam = (examId: number, questionIds: number[]) => ({
    id: examId,
    questions: questionIds,
  });

  const createMockQuestion = (id: number, type: 'open' | 'closed' = 'closed') => ({
    id,
    type,
    options: [
      { id: 1, isCorrect: true },
      { id: 2, isCorrect: false },
      { id: 3, isCorrect: false },
    ],
  });

  const createMockResponse = (studentCPF: string, examId: number, answers: any[]) => ({
    id: Date.now(),
    studentCPF,
    examId,
    answers,
    grade_closed: undefined,
  });

  const createMockAnswer = (questionId: number, answer: string) => ({
    questionId,
    answer,
    grade: undefined,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset path.join and path.resolve mocks to return the last argument
    (path.join as jest.Mock).mockImplementation((...args) => args[args.length - 1]);
    (path.resolve as jest.Mock).mockImplementation((...args) => args[args.length - 1]);
    // Ensure student registry is clean between tests
    try {
      studentSet.getAllStudents().forEach(s => studentSet.removeStudent(s.getCPF()));
    } catch (e) {
      // ignore
    }
  });

  // Helper to mock fs.readFileSync with proper file content
  const mockFileSystem = (mockExamsData: any, mockQuestionsData: any, mockResponsesData: any) => {
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (!filePath) return '{}';
      if (typeof filePath === 'string') {
        if (filePath.includes('exams.json')) return JSON.stringify(mockExamsData);
        if (filePath.includes('questions.json')) return JSON.stringify(mockQuestionsData);
        if (filePath.includes('responses.json')) return JSON.stringify(mockResponsesData);
      }
      return '{}';
    });
    (fs.writeFileSync as jest.Mock).mockImplementation(() => {});
  };

  describe('Batch Correction: Correcting all students in an exam', () => {
    it('should return batch results with all students when correcting an exam', () => {
      // Arrange
      const student1CPF = '12345678901';
      const student2CPF = '12345678902';
      const examId = 1;
      const questionIds = [1, 2];

      const mockExamsData = {
        exams: [createMockExam(examId, questionIds)],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1), createMockQuestion(2)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(student1CPF, examId, [
            createMockAnswer(1, '1'), // Correct
            createMockAnswer(2, '1'), // Correct
          ]),
          createMockResponse(student2CPF, examId, [
            createMockAnswer(1, '1'), // Correct
            createMockAnswer(2, '2'), // Incorrect
          ]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert
      expect(result).toBeDefined();
      expect(result.examId).toBe(examId);
      expect(result.correctedCount).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].studentCPF).toBe(student1CPF);
      expect(result.results[0].finalGrade).toBe(100);
      expect(result.results[1].studentCPF).toBe(student2CPF);
      expect(result.results[1].finalGrade).toBe(50);
    });

    it('should register all grades in responses file after correction', () => {
      // Arrange
      const student1CPF = '12345678901';
      const student2CPF = '12345678902';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(student1CPF, examId, [createMockAnswer(1, '1')]),
          createMockResponse(student2CPF, examId, [createMockAnswer(1, '1')]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result.results.every(r => r.finalGrade >= 0 && r.finalGrade <= 100)).toBe(true);
    });
  });

  describe('Scenario 1: Batch correction of multiple students with correct answers', () => {
    it('should calculate grade 100 for students who answer all questions correctly', () => {
      // Arrange
      const student1CPF = '12345678901';
      const student2CPF = '12345678902';
      const examId = 1;
      const questionIds = [1, 2];

      const mockExamsData = {
        exams: [createMockExam(examId, questionIds)],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1), createMockQuestion(2)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(student1CPF, examId, [
            createMockAnswer(1, '1'), // Correct
            createMockAnswer(2, '1'), // Correct
          ]),
          createMockResponse(student2CPF, examId, [
            createMockAnswer(1, '1'), // Correct
            createMockAnswer(2, '1'), // Correct
          ]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert
      expect(result).toBeDefined();
      expect(result.examId).toBe(examId);
      expect(result.correctedCount).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].finalGrade).toBe(100);
      expect(result.results[1].finalGrade).toBe(100);
    });

    it('should persist all corrected grades to file after batch correction', () => {
      // Arrange
      const student1CPF = '12345678901';
      const student2CPF = '12345678902';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(student1CPF, examId, [createMockAnswer(1, '1')]),
          createMockResponse(student2CPF, examId, [createMockAnswer(1, '1')]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(result.results.every(r => r.finalGrade >= 0 && r.finalGrade <= 100)).toBe(true);
    });
  });

  describe('Scenario 2: Batch correction with mixed correct/incorrect answers', () => {
    it('should calculate different grades for students with different answer accuracy', () => {
      // Arrange
      const student1CPF = '12345678901';
      const student2CPF = '12345678902';
      const examId = 2;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(student1CPF, examId, [createMockAnswer(1, '2')]), // Incorrect
          createMockResponse(student2CPF, examId, [createMockAnswer(1, '1')]), // Correct
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert
      expect(result.correctedCount).toBe(2);
      const student1Result = result.results.find(r => r.studentCPF === student1CPF);
      const student2Result = result.results.find(r => r.studentCPF === student2CPF);
      expect(student1Result?.finalGrade).toBe(0);
      expect(student2Result?.finalGrade).toBe(100);
    });

    it('should handle multiple students corrections in batch operation', () => {
      // Arrange
      const students = ['12345678901', '12345678902', '12345678903'];
      const examId = 2;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: students.map((cpf, idx) =>
          createMockResponse(cpf, examId, [createMockAnswer(1, idx === 0 ? '1' : '2')])
        ),
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert
      expect(result.correctedCount).toBe(3);
      expect(result.results).toHaveLength(3);
      result.results.forEach((r, idx) => {
        expect(r.studentCPF).toBe(students[idx]);
        expect(r.finalGrade).toBe(idx === 0 ? 100 : 0);
      });
    });
  });

  describe('Scenario 3: Partial answers - students answering subset of questions', () => {
    it('should calculate partial grade when student answers subset of exam questions', () => {
      // Arrange
      const studentCPF = '12345678901';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1, 2, 3])],
      };

      const mockQuestionsData = {
        questions: [
          createMockQuestion(1),
          createMockQuestion(2),
          createMockQuestion(3),
        ],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(studentCPF, examId, [
            createMockAnswer(1, '1'), // Correct
            createMockAnswer(2, '1'), // Correct
            // Question 3 not answered
          ]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].finalGrade).toBeCloseTo(66.7, 1);
    });
  });

  describe('getAnswersForExam service scenarios', () => {
    it('returns submitted answers for an exam and resolves student names when available', () => {
      // Arrange
      const student1CPF = '12345678901';
      const student2CPF = '12345678902';
      const examId = 1;

      // add only the first student to the registry to test name resolution and missing student
      studentSet.addStudent(new Student('Vinicius', student1CPF, 'vinicius@example.com'));

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(student1CPF, examId, [createMockAnswer(1, 'a')]),
          createMockResponse(student2CPF, examId, [createMockAnswer(1, 'b')]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.getAnswersForExam(examId);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      const entry1 = result.find((r: any) => r.studentCPF === student1CPF);
      const entry2 = result.find((r: any) => r.studentCPF === student2CPF);
      expect(entry1).toBeDefined();
      expect(entry1.name).toBe('Vinicius');
      expect(entry1.answers[0].questionId).toBe(1);
      expect(entry1.answers[0].grade).toBeNull();
      expect(entry2).toBeDefined();
      expect(entry2.name).toBe('Aluno não registrado');
    });

    it('returns graded answers when responses contain grades', () => {
      // Arrange
      const studentCPF = '12345678901';
      const examId = 1;
      studentSet.addStudent(new Student('Ana', studentCPF, 'ana@example.com'));

      const mockExamsData = { exams: [createMockExam(examId, [1])] };
      const mockQuestionsData = { questions: [createMockQuestion(1)] };
      const mockResponsesData = {
        responses: [
          { ...createMockResponse(studentCPF, examId, [ { questionId: 1, answer: '1', grade: 85 } ]), grade_closed: 85 }
        ]
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.getAnswersForExam(examId);

      // Assert
      expect(result).toHaveLength(1);
      const entry = result[0];
      expect(entry.studentCPF).toBe(studentCPF);
      expect(entry.name).toBe('Ana');
      expect(entry.answers[0].grade).toBe(85);
    });

    it('returns empty list when no responses exist for the exam', () => {
      // Arrange
      const examId = 42;
      const mockExamsData = { exams: [createMockExam(1, [1])] };
      const mockQuestionsData = { questions: [createMockQuestion(1)] };
      const mockResponsesData = { responses: [] };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.getAnswersForExam(examId);

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(0);
    });
  });

  describe('Scenario 4: No responses submitted for exam', () => {
    it('should handle exam with no student responses', () => {
      // Arrange
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1, 2])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1), createMockQuestion(2)],
      };

      const mockResponsesData = {
        responses: [], // No responses for any student
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act & Assert
      expect(() => {
        Correction.correctExam(examId);
      }).toThrow('No responses found for this exam');
    });
  });

  describe('Scenario 5: Invalid exam ID', () => {
    it('should return error when exam does not exist', () => {
      // Arrange
      const invalidExamId = 999;

      const mockExamsData = {
        exams: [], // No exams
      };

      const mockQuestionsData = {
        questions: [],
      };

      const mockResponsesData = {
        responses: [],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act & Assert
      expect(() => {
        Correction.correctExam(invalidExamId);
      }).toThrow('Exam not found');
    });
  });

  describe('Scenario 6: Exam with already graded responses', () => {
    it('should recalculate grades even if responses were previously graded', () => {
      // Arrange
      const student1CPF = '12345678901';
      const student2CPF = '12345678902';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: [
          {
            ...createMockResponse(student1CPF, examId, [createMockAnswer(1, '1')]),
            grade_closed: 100, // Already has previous grade
          },
          {
            ...createMockResponse(student2CPF, examId, [createMockAnswer(1, '2')]),
            grade_closed: 50, // Already has previous grade
          },
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert
      expect(result.correctedCount).toBe(2);
      const student1Result = result.results.find(r => r.studentCPF === student1CPF);
      const student2Result = result.results.find(r => r.studentCPF === student2CPF);
      expect(student1Result?.finalGrade).toBe(100); // Recalculated
      expect(student2Result?.finalGrade).toBe(0); // Recalculated
    });
  });

  describe('Scenario 7: Exam with no answer key defined', () => {
    it('should calculate grade 0 when exam questions have no correct answers', () => {
      // Arrange
      const studentCPF = '12345678901';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1, 2])],
      };

      const mockQuestionsData = {
        questions: [
          { id: 1, type: 'closed', options: [] }, // No correct answer defined
          { id: 2, type: 'closed', options: [] },
        ],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(studentCPF, examId, [
            createMockAnswer(1, '1'),
            createMockAnswer(2, '1'),
          ]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].finalGrade).toBe(0);
    });
  });

  describe('Scenario 8: Non-existent exam with existing responses', () => {
    it('should return error when exam ID does not match any exam definition', () => {
      // Arrange
      const nonExistentExamId = 999;

      const mockExamsData = {
        exams: [
          createMockExam(1, [1]),
          createMockExam(2, [2]),
        ],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1), createMockQuestion(2)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse('12345678901', nonExistentExamId, [createMockAnswer(1, '1')]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act & Assert
      expect(() => {
        Correction.correctExam(nonExistentExamId);
      }).toThrow('Exam not found');
    });
  });

  describe('Edge cases: Multiple correct options per question', () => {
    it('should handle questions with multiple correct answer options', () => {
      // Arrange
      const studentCPF = '12345678901';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [
          {
            id: 1,
            type: 'closed',
            options: [
              { id: 1, isCorrect: true },
              { id: 2, isCorrect: true },
              { id: 3, isCorrect: false },
            ],
          },
        ],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(studentCPF, examId, [
            createMockAnswer(1, '1'), // Selected 1 out of 2 correct options
          ]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert
      expect(result.results).toHaveLength(1);
      expect(result.results[0].finalGrade).toBe(50); // 1 out of 2 correct
    });

    it('should persist all corrected grades to responses file', () => {
      // Arrange
      const student1CPF = '12345678901';
      const student2CPF = '12345678902';
      const examId = 1;

      const mockExamsData = {
        exams: [createMockExam(examId, [1])],
      };

      const mockQuestionsData = {
        questions: [createMockQuestion(1)],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(student1CPF, examId, [createMockAnswer(1, '1')]),
          createMockResponse(student2CPF, examId, [createMockAnswer(1, '2')]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      Correction.correctExam(examId);

      // Assert
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('responses.json'),
        expect.any(String)
      );
    });

    it('should count only closed questions in exam with mixed open and closed questions', () => {
      // Arrange: exam has 3 closed questions and 1 open question
      // Student answers 2 of 3 closed questions correctly
      const studentCPF = '12345678901';
      const examId = 3;

      const mockExamsData = {
        exams: [createMockExam(examId, [1, 2, 3, 4])],
      };

      const mockQuestionsData = {
        questions: [
          {
            id: 1,
            type: 'closed',
            options: [{ id: 1, isCorrect: true }],
          },
          {
            id: 2,
            type: 'closed',
            options: [{ id: 1, isCorrect: true }],
          },
          {
            id: 3,
            type: 'closed',
            options: [{ id: 1, isCorrect: true }],
          },
          {
            id: 4,
            type: 'open',
            options: [],
          },
        ],
      };

      const mockResponsesData = {
        responses: [
          createMockResponse(studentCPF, examId, [
            createMockAnswer(1, '1'),                // correct
            createMockAnswer(2, '1'),                // correct
            createMockAnswer(3, '2'),                // incorrect (wrong option)
            createMockAnswer(4, 'some text response'), // open question (ignored)
          ]),
        ],
      };

      mockFileSystem(mockExamsData, mockQuestionsData, mockResponsesData);

      // Act
      const result = Correction.correctExam(examId);

      // Assert: grade is 66.7 (2 correct out of 3 closed questions; open question ignored)
      expect(result.examId).toBe(examId);
      expect(result.correctedCount).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].studentCPF).toBe(studentCPF);
      expect(result.results[0].finalGrade).toBeCloseTo(66.7, 1);
    });
  });
});
