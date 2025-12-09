import fs from "fs";
import path from "path";

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

  static correctExam(studentCPF: string, examId: number) {
    const examsData = this.loadJson(this.examsPath);
    const questionsData = this.loadJson(this.questionsPath);
    const responsesData = this.loadJson(this.responsesPath);

    const exam: Exam = examsData.exams.find((e: Exam) => e.id === examId);
    if (!exam) throw new Error("Exam not found");

    const response: ResponseItem = responsesData.responses
      .find((r: ResponseItem) => r.examId === examId && r.studentCPF === studentCPF);

    if (!response) throw new Error("Answer key not found for this exam");

    let gradeSum = 0;
    let totalQuestions = 0;

    response.answers.forEach((studentAnswer) => {
      let totalCorrectOpt = 0;
      let correctCount = 0;

      const question = questionsData.questions.find(
        (a: Question) => a.id === studentAnswer.questionId && a.type === "closed"
      );

      if (!question) return;

      totalQuestions++;

      question.options.forEach((opt: Options) => {
        if (opt.isCorrect) {
          totalCorrectOpt++;
        }

        if (opt.isCorrect && opt.id.toString() === studentAnswer.answer) {
          correctCount++;
        }
      });

      const questionGrade = totalCorrectOpt > 0 ? (correctCount / totalCorrectOpt) * 100 : 0;
      gradeSum += questionGrade;
      studentAnswer.grade = questionGrade;
    });
    
    const finalGrade = totalQuestions > 0 ? (gradeSum / totalQuestions) : 0;

    response.grade_closed = finalGrade;

    this.saveJson(this.responsesPath, responsesData);

    return {
      studentCPF,
      examId,
      finalGrade,
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

}
