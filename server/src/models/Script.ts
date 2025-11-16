export class Script {
  private id: string;
  public title?: string;
  public content?: any;

  constructor(id: string, title?: string, content?: any) {
    this.id = id;
    this.title = title;
    this.content = content;
  }

  getId(): string {
    return this.id;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content
    };
  }

  update(data: Partial<{ title: any; content: any }>) {
    if (data.title !== undefined) this.title = data.title;
    if (data.content !== undefined) this.content = data.content;
  }

  static fromJSON(obj: any): Script {
    return new Script(obj.id, obj.title, obj.content);
  }
}