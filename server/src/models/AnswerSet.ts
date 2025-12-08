import { Answer } from './Answer';
import { Task } from './Task';
export class AnswerSet {
  private items: Answer[] = [];

  addAnswer(data: any): Answer {
    const id = data.id ?? Date.now().toString();
    const answer = new Answer(id, data.task);
    if (data.started_at !== undefined) answer.update({ started_at: data.started_at });
    if (data.submitted_at !== undefined) answer.update({ submitted_at: data.submitted_at });
    if (data.time_taken_seconds !== undefined) answer.update({ time_taken_seconds: data.time_taken_seconds });
    if (data.response !== undefined) answer.update({ response: data.response });
    if (data.status !== undefined) answer.update({ status: data.status });
    this.items.push(answer);
    return answer;
  }

  getAllAnswers(): Answer[] {
    return this.items;
  }

  findById(id: string): Answer | undefined {
    return this.items.find(a => a.getId() === id);
  }

  updateAnswer(id: string, data: any): Answer | undefined {
    const answer = this.findById(id);
    if (!answer) return undefined;
    answer.update(data);
    return answer;
  }
}