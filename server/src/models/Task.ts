export class Task {
  private id: string;
  public statement: string;

  constructor(id: string, statement: string) {
    this.id = id;
    this.statement = statement;
  }

  getId(): string {
    return this.id;
  }

  toJSON() {
    return {
      id: this.id,
      statement: this.statement
    };
  }

  update(data: Partial<{ statement: any; attachment: any }>) {
    if (data.statement !== undefined) this.statement = data.statement;
  }

  static fromJSON(obj: any): Task {
    return new Task(obj.id, obj.statement);
  }
}

