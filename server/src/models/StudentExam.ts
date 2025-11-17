import { StudentAnswer } from './StudentAnswer';

export class StudentExam {
  private id: number;
  private studentCPF: string;
  private examId: number;
  private answers: StudentAnswer[];

  constructor(id: number, studentCPF: string, examId: number, answers: StudentAnswer[] = []) {
    this.id = id;
    this.studentCPF = studentCPF;
    this.examId = examId;
    this.answers = answers;
  }

  public getId(): number {
    return this.id;
  }

  public getStudentCPF(): string {
    return this.studentCPF;
  }

  public getExamId(): number {
    return this.examId;
  }

  public getAnswers(): StudentAnswer[] {
    return [...this.answers];
  }

  public getAnswerByQuestionId(questionId: number): StudentAnswer | undefined {
    return this.answers.find(answer => answer.getQuestionId() === questionId);
  }

  public addOrUpdateAnswer(questionId: number, answer: string, score: number = 0): void {
    const existingAnswer = this.getAnswerByQuestionId(questionId);
    if (existingAnswer) {
      existingAnswer.setAnswer(answer);
      existingAnswer.setScore(score);
    } else {
      this.answers.push(new StudentAnswer(questionId, answer, score));
    }
  }

  public setAnswerScore(questionId: number, score: number): boolean {
    const answer = this.getAnswerByQuestionId(questionId);
    if (answer) {
      answer.setScore(score);
      return true;
    }
    return false;
  }

  public getTotalScore(): number {
    if (this.answers.length === 0) return 0;
    const sum = this.answers.reduce((acc, answer) => acc + answer.getScore(), 0);
    return sum / this.answers.length;
  }

  public toJSON() {
    return {
      id: this.id,
      studentCPF: this.studentCPF,
      examId: this.examId,
      answers: this.answers.map(answer => answer.toJSON())
    };
  }

  public static fromJSON(data: {
    id: number;
    studentCPF: string;
    examId: number;
    answers: Array<{ questionId: number; answer: string; score?: number }>;
  }): StudentExam {
    const answers = data.answers.map(answerData => StudentAnswer.fromJSON(answerData));
    return new StudentExam(data.id, data.studentCPF, data.examId, answers);
  }
}

