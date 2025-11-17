export class QuestionOption {
  private id: number;
  private option: string;
  private isCorrect: boolean;

  constructor(id: number, option: string, isCorrect: boolean) {
    this.id = id;
    this.option = option;
    this.isCorrect = isCorrect;
  }

  public getId(): number {
    return this.id;
  }

  public getOption(): string {
    return this.option;
  }

  public getIsCorrect(): boolean {
    return this.isCorrect;
  }

  public setIsCorrect(isCorrect: boolean): void {
    this.isCorrect = isCorrect;
  }

  public toJSON() {
    return {
      id: this.id,
      option: this.option,
      isCorrect: this.isCorrect
    };
  }

  public static fromJSON(data: { id: number; option: string; isCorrect: boolean }): QuestionOption {
    return new QuestionOption(data.id, data.option, data.isCorrect);
  }
}

