export class Task {
  private id: string;
  public statement: string;
  public attachments?: any;

  constructor(id: string, statement: string, attachments?: any) {
    this.id = id;
    this.statement = statement;
    this.attachments = attachments;;
  }

  getId(): string {
    return this.id;
  }

  toJSON() {
    return {
      id: this.id,
      statement: this.statement,
      attachments: this.attachments
    };
  }

  update(data: Partial<{ statement: any; attachment: any }>) {
    if (data.statement !== undefined) this.statement = data.statement;
    if (data.attachment !== undefined) this.attachments = data.attachment;
  }

  static fromJSON(obj: any): Task {
    return new Task(obj.id, obj.statement, obj.attachments);
  }
}