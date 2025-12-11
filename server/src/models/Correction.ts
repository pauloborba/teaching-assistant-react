import fs from "fs";
import path from "path";
import { studentSet } from "../services/dataService";

type Question = {
  id: number;
  type: "open" | "closed";
  grade?: number;
  options?: Options[];
};

type Options = {
  id: number;
  isCorrect: boolean;
}

type Exam = {
  id: number;
  questions: number[];
};

type Answer = {
  questionId: number;
  answer: string;
  grade?: number;
};

type ResponseItem = {
  id: number;
  studentCPF: string;
  examId: number;
  grade_closed?: number;
  answers: Answer[];
};

export class Correction {
  private static examsPath = path.join(__dirname, "../../data/exams.json");
  private static questionsPath = path.join(__dirname, "../../data/questions.json");
  private static responsesPath = path.join(__dirname, "../../data/responses.json");

  private static loadJson(filePath: string) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  private static saveJson(filePath: string, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  static correctExam(examId: number) {
    const examsData = this.loadJson(this.examsPath);
    const questionsData = this.loadJson(this.questionsPath);
    const responsesData = this.loadJson(this.responsesPath);

    const exam: Exam = examsData.exams.find((e: Exam) => e.id === examId);
    if (!exam) throw new Error("Exam not found");

    const studentResponses: ResponseItem[] = responsesData.responses
      .filter((r: ResponseItem) => r.examId === examId);

    if (studentResponses.length === 0) throw new Error("No responses found for this exam");

    const results: Array<{ studentCPF: string; examId: number; finalGrade: number }> = [];

    studentResponses.forEach((response: ResponseItem) => {
      // Compute only the closed questions that belong to this exam (the answer key)
      const closedQuestionIds: number[] = (exam.questions || []).filter((qid: number) => {
        const q = questionsData.questions.find((a: Question) => a.id === qid);
        return q && q.type === 'closed';
      });

      const totalQuestions = closedQuestionIds.length;
      let gradeSum = 0;

      // For each closed question in the exam, compute the student's score (0 if no answer)
      closedQuestionIds.forEach((questionId) => {
        const question = questionsData.questions.find(
          (a: Question) => a.id === questionId && a.type === 'closed'
        );

        if (!question) return;

        const studentAnswer = response.answers.find((sa: Answer) => sa.questionId === questionId);

        let totalCorrectOpt = 0;
        let correctCount = 0;

        (question.options || []).forEach((opt: Options) => {
          if (opt.isCorrect) totalCorrectOpt++;
          if (studentAnswer && opt.isCorrect && opt.id.toString() === String(studentAnswer.answer)) {
            correctCount++;
          }
        });

        const questionGrade = totalCorrectOpt > 0 ? (correctCount / totalCorrectOpt) * 100 : 0;
        gradeSum += questionGrade;
        if (studentAnswer) studentAnswer.grade = questionGrade;
      });

      const finalGrade = totalQuestions > 0 ? (gradeSum / totalQuestions) : 0;
      response.grade_closed = finalGrade;

      results.push({
        studentCPF: response.studentCPF,
        examId,
        finalGrade,
      });
    });

    this.saveJson(this.responsesPath, responsesData);

    return {
      examId,
      correctedCount: results.length,
      results,
    };
  }

  static getGrade(studentCPF: string, examId: number): number | null {
    const responsesData = this.loadJson(this.responsesPath);

    const response: ResponseItem = responsesData.responses
      .find((r: ResponseItem) => r.examId === examId && r.studentCPF === studentCPF);

    if (!response || response.grade_closed === undefined) {
      return null;
    }

    return response.grade_closed;
  }

  static getAnswersForExam(examId: number) {
    const responsesData = this.loadJson(this.responsesPath);
    
    const grades = responsesData.responses
      .filter((r: ResponseItem) => r.examId === examId)
      .map((r: ResponseItem) => ({
        studentCPF: r.studentCPF,
        name: studentSet.findStudentByCPF(r.studentCPF)?.name ?? "Aluno não registrado",
        answers: r.answers.map((a: Answer) => ({
          questionId: a.questionId,
          grade: a.grade !== undefined ? a.grade : null,
        }))
      }));

    return grades;
  }
}
