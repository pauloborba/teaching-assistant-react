import { Task } from './Task';
export class Answer {
  private id: string;
  public task: Task;
  public started_at?: number;
  public submitted_at?: number;
  public time_taken_seconds?: number;
  public response?: any;
  public status: 'pending' | 'started' | 'submitted' | 'timed_out' = 'pending';

  constructor(id: string, task: Task) {
    this.id = id;
    this.task = task;
  }

  getId() { return this.id; }

  toJSON() {
    return {
      id: this.id,
      taskId: this.task.getId(),
      started_at: this.started_at,
      submitted_at: this.submitted_at,
      time_taken_seconds: this.time_taken_seconds,
      response: this.response,
      status: this.status
    };
  }

  update(data: Partial<{
    started_at: number;
    submitted_at: number;
    time_taken_seconds: number;
    response: any;
    status: 'pending' | 'started' | 'submitted' | 'timed_out';
  }>) {
    if (data.started_at !== undefined) this.started_at = data.started_at;
    if (data.submitted_at !== undefined) this.submitted_at = data.submitted_at;
    if (data.time_taken_seconds !== undefined) this.time_taken_seconds = data.time_taken_seconds;
    if (data.response !== undefined) this.response = data.response;
    if (data.status !== undefined) this.status = data.status;
  }

  static fromJSON(obj: any, task: Task): Answer {
    const a = new Answer(obj.id, task);
    a.started_at = obj.started_at;
    a.submitted_at = obj.submitted_at;
    a.time_taken_seconds = obj.time_taken_seconds;
    a.response = obj.response;
    a.status = obj.status ?? 'pending';
    return a;
  }
}