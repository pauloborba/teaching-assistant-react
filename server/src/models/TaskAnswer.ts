import { Task } from "./Task";
import { Grade } from "./Evaluation";

export class TaskAnswer {
  public id: string;
  public task: string;
  public started_at?: number;
  public submitted_at?: number;
  public time_taken_seconds?: number;
  public answer?: string;
  private grade?: Grade;
  public comments?: string;
  public status: 'pending' | 'started' | 'submitted' | 'timed_out' = 'pending';


  constructor(id: string, task: string, answer?: string, grade?: Grade, comments?: string,started_at?: number,submitted_at?: number,time_taken_seconds?: number,status?: 'pending' | 'started' | 'submitted' | 'timed_out') {
    this.id = id;
    this.task = task;
    this.answer = answer;
    this.grade = grade;
    this.comments = comments;
    this.started_at = started_at ?? Date.now();
    this.submitted_at = submitted_at;
    this.time_taken_seconds = time_taken_seconds;
    this.status = status ?? (submitted_at ? 'submitted' : 'started');
    if(grade && grade != "MA" && grade != "MPA" && grade != "MANA") {
      throw new Error('Invalid grade value');
    }
  }

  getTaskId(): string {
    return this.task;
  }

  toJSON() {
    return {
      id: this.id,
      task: this.task,
      answer: this.answer,
      started_at: this.started_at,
      submitted_at: this.submitted_at,
      time_taken_seconds: this.time_taken_seconds,
      grade: this.grade ? this.grade : undefined,
      comments: this.comments,
      status: this.status,
    };
  }

  updateGrade(grade: Grade | undefined) {
    if(grade && grade != "MA" && grade != "MPA" && grade != "MANA") {
      throw new Error('Invalid grade value');
    }
    this.grade = grade;
  }

  update(data: Partial<{
    task: any; 
    answer : any; 
    grade: any; 
    comments: any 
    started_at: number;
    submitted_at: number;
    time_taken_seconds: number;
    status: 'pending' | 'started' | 'submitted' | 'timed_out';
  }>) {
    if (data.task) this.task = data.task;
    if (data.answer) this.answer = data.answer;
    if (data.grade !== undefined) this.updateGrade(data.grade);
    if (data.comments !== undefined) this.comments = data.comments;
    if (data.status !== undefined) this.status = data.status;
    if (data.started_at !== undefined) this.started_at = data.started_at;
    if (data.submitted_at !== undefined) this.submitted_at = data.submitted_at;
    if (data.time_taken_seconds !== undefined) this.time_taken_seconds = data.time_taken_seconds;
  }

  isAnswerEmpty(): boolean {
    return !this.answer || this.answer.trim() === '';
  }
  
  submit(answer?: string) {
    if (answer !== undefined) this.answer = answer;
    this.submitted_at = Date.now();
    this.status = 'submitted';
    if (this.started_at) {
      this.time_taken_seconds = Math.max(0, Math.round((this.submitted_at - this.started_at) / 1000));
    }
  }

  static fromJSON(obj: any): TaskAnswer {
    return new TaskAnswer(obj.id, obj.task, obj.answer, obj.grade, obj.comments, obj.started_at, obj.submitted_at, obj.time_taken_seconds, obj.status);
  }

  getGrade(): Grade | undefined {
    return this.grade;
  }
}

