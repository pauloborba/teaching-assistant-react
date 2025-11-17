import fs from "fs";
import path from "path";

type Option = {
  id: number;
  option: string;
  isCorrect: boolean;
};

type Question = {
  id: number;
  type: "open" | "closed";
  options?: Option[];
};

type Exam = {
  id: number;
  questions: number[];
};

type Answer = {
  questionId: number;
  answer: string;
  grade?: number;
};

type StudentExam = {
  id: number;
  studentCPF: string;
  examId: number;
  answers: Answer[];
};

export class Correction {
  private static examsPath = path.join(__dirname, "../../data/exams.json");
  private static questionsPath = path.join(__dirname, "../../data/questions.json");
  private static studentsExamsPath = path.join(__dirname, "../../data/students-exams.json");

  private static loadJson(filePath: string) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }

  private static saveJson(filePath: string, data: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  static correctExam(studentCPF: string, examId: number) {
    const examsData = this.loadJson(this.examsPath);
    const questionsData = this.loadJson(this.questionsPath);
    const studentsExamsData = this.loadJson(this.studentsExamsPath);

    const exam: Exam = examsData.exams.find((e: Exam) => e.id === examId);
    if (!exam) throw new Error("Exam not found");

    const studentExam: StudentExam =
      studentsExamsData.studentsExams.find(
        (se: StudentExam) => se.studentCPF === studentCPF && se.examId === examId
      );
    if (!studentExam) throw new Error("Student exam not found");

    // Todas as questões do exame (somente fechadas)
    const closedQuestions: Question[] = exam.questions
      .map((qid) => questionsData.questions.find((q: Question) => q.id === qid))
      .filter((q: Question) => q.type === "closed");

    const totalClosed = closedQuestions.length;

    let correctCount = 0;

    // Corrigir cada questão fechada
    closedQuestions.forEach((question) => {
      const studentAnswer = studentExam.answers.find(
        (a) => a.questionId === question.id
      );

      if (!studentAnswer) return;

      const correctOption = question.options?.find((o) => o.isCorrect);

      // Se acertou, marca grade 1, senão 0
      if (studentAnswer.answer.trim() === correctOption?.option.trim()) {
        studentAnswer.grade = 1;
        correctCount++;
      } else {
        studentAnswer.grade = 0;
      }
    });

    // Nota final de 0 a 10
    const finalGrade = totalClosed > 0 ? (correctCount / totalClosed) * 10 : 0;

    // Salvar no arquivo
    this.saveJson(this.studentsExamsPath, studentsExamsData);

    return {
      studentCPF,
      examId,
      correctCount,
      totalClosed,
      finalGrade,
    };
  }
}
