import { Task } from './Task';

export class TaskSet {
  private items: Task[] = [];

  addTask(data: any): Task {
    const id = data.id ?? Date.now().toString();
    const task = new Task(id, data.title, data.content);
    this.items.push(task);
    return task;
  }

  getAllTasks(): Task[] {
    return this.items;
  }

  findById(id: string): Task | undefined {
    return this.items.find(s => s.getId() === id);
  }

  updateTask(id: string, data: any): Task | undefined {
    const task = this.findById(id);
    if (!task) return undefined;
    task.update(data);
    return task;
  }
  
}