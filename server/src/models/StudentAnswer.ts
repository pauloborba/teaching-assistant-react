export class StudentAnswer {
  private questionId: number;
  private answer: string;
  private score: number; // 0-100 percentage

  constructor(questionId: number, answer: string, score: number = 0) {
    this.questionId = questionId;
    this.answer = answer;
    this.score = Math.max(0, Math.min(100, score)); // Clamp between 0 and 100
  }

  public getQuestionId(): number {
    return this.questionId;
  }

  public getAnswer(): string {
    return this.answer;
  }

  public getScore(): number {
    return this.score;
  }

  public setAnswer(answer: string): void {
    this.answer = answer;
  }

  public setScore(score: number): void {
    this.score = Math.max(0, Math.min(100, score)); // Clamp between 0 and 100
  }

  public toJSON() {
    return {
      questionId: this.questionId,
      answer: this.answer,
      score: this.score
    };
  }

  public static fromJSON(data: { questionId: number; answer: string; score?: number }): StudentAnswer {
    return new StudentAnswer(data.questionId, data.answer, data.score || 0);
  }
}

