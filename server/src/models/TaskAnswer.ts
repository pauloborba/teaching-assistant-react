import { Task } from "./Task";
import { Grade } from "./Evaluation";

export class TaskAnswer {
  public id: string;
  public task: Task;
  public answer?: string;
  private grade?: Grade;
  public comments?: string;

  constructor(id: string, task: Task, answer?: string, grade?: Grade, comments?: string) {
    this.id = id;
    this.task = task;
    this.answer = answer;
    this.grade = grade;
    this.comments = comments;

    if(grade && grade != "MA" && grade != "MPA" && grade != "MANA") {
      throw new Error('Invalid grade value');
    }
  }

  getTaskId(): string {
    return this.task.getId();
  }

  toJSON() {
    return {
      id: this.id,
      task: this.task.toJSON(),
      answer: this.answer,
      grade: this.grade ? this.grade : undefined,
      comments: this.comments
    };
  }

  updateGrade(grade: Grade | undefined) {
    if(grade && grade != "MA" && grade != "MPA" && grade != "MANA") {
      throw new Error('Invalid grade value');
    }
    this.grade = grade;
  }

  update(data: Partial<{task: any; answer : any; grade: any; comments: any }>) {
    if (data.task) this.task = Task.fromJSON(data.task);
    if (data.answer) this.answer = data.answer;
    if (data.grade !== undefined) this.updateGrade(data.grade);
    if (data.comments !== undefined) this.comments = data.comments;
  }

  static fromJSON(obj: any): TaskAnswer {
    return new TaskAnswer(obj.id, obj.task, obj.answer, obj.grade, obj.comments);
  }

  getGrade(): Grade | undefined {
    return this.grade;
  }
}

