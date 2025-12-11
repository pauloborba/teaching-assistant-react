import fs from "fs";
import { Correction } from "../../src/models/Correction";

// Mock do studentSet
jest.mock("../../src/services/dataService", () => ({
  studentSet: {
    findStudentByCPF: jest.fn()
  }
}));

import { studentSet } from "../../src/services/dataService";

describe("Correction - Unit Tests", () => {

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe("correctExam()", () => {
    it("calculates grade correctly for closed questions", () => {
      const mockExams = {
        exams: [{ id: 1, questions: [1, 2] }]
      };

      const mockQuestions = {
        questions: [
          { id: 1, type: "closed", options: [{ id: 1, isCorrect: true }] },
          { id: 2, type: "closed", options: [{ id: 1, isCorrect: true }] }
        ]
      };

      const mockResponses = {
        responses: [
          {
            id: 1,
            studentCPF: "111",
            examId: 1,
            answers: [
              { questionId: 1, answer: "1" },
              { questionId: 2, answer: "2" }
            ]
          }
        ]
      };

      jest.spyOn(fs, "readFileSync")
        .mockReturnValueOnce(JSON.stringify(mockExams))
        .mockReturnValueOnce(JSON.stringify(mockQuestions))
        .mockReturnValueOnce(JSON.stringify(mockResponses));

      jest.spyOn(fs, "writeFileSync").mockImplementation(() => {});

      const result = Correction.correctExam(1);

      expect(result.examId).toBe(1);
      expect(result.correctedCount).toBe(1);
      expect(result.results[0].studentCPF).toBe("111");
      expect(result.results[0].finalGrade).toBeCloseTo(50, 1);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("throws error when exam is not found", () => {
      jest.spyOn(fs, "readFileSync")
        .mockReturnValueOnce(JSON.stringify({ exams: [] }))
        .mockReturnValueOnce(JSON.stringify({ questions: [] }))
        .mockReturnValueOnce(JSON.stringify({ responses: [] }));

      expect(() => {
        Correction.correctExam(999);
      }).toThrow("Exam not found");
    });
  });

  describe("getGrade()", () => {
    it("returns the grade when found", () => {
      jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({
        responses: [
          {
            studentCPF: "111",
            examId: 1,
            grade_closed: 85,
            answers: []
          }
        ]
      }));

      const grade = Correction.getGrade("111", 1);
      expect(grade).toBe(85);
    });

    it("returns null when grade not found", () => {
      jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({
        responses: []
      }));

      const grade = Correction.getGrade("111", 1);
      expect(grade).toBeNull();
    });
  });

  describe("getAnswersForExam()", () => {
    it("returns answers with student name when student is registered", () => {
      (studentSet.findStudentByCPF as jest.Mock)
        .mockReturnValue({ name: "Vinicius" });

      jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({
        responses: [
          {
            studentCPF: "111",
            examId: 1,
            answers: [{ questionId: 1, grade: 80 }]
          }
        ]
      }));

      const result = Correction.getAnswersForExam(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Vinicius");
      expect(result[0].answers[0].grade).toBe(80);
    });

    it("returns default name when student is not registered", () => {
      (studentSet.findStudentByCPF as jest.Mock)
        .mockReturnValue(undefined);

      jest.spyOn(fs, "readFileSync").mockReturnValueOnce(JSON.stringify({
        responses: [
          {
            studentCPF: "222",
            examId: 1,
            answers: [{ questionId: 1, grade: null }]
          }
        ]
      }));

      const result = Correction.getAnswersForExam(1);

      expect(result[0].name).toBe("Aluno não registrado");
    });
  });

});
