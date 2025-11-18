import { Task } from "./Task";

export class Script {
  private id: string;
  public title?: string;
  public tasks: Task[] = [];

  constructor(id: string, title?: string, tasks?: Task[]) {
    this.id = id;
    this.title = title;
    this.tasks = tasks || [];
  }

  getId(): string {
    return this.id;
  }

toJSON() {
  return {
    id: this.id,
    title: this.title,
    tasks: this.tasks.map(task => {
      if (task && typeof task.toJSON === "function") {
        return task.toJSON();
      }
      console.warn("Invalid task detected:", task);
      return null;
    }).filter(Boolean)
  };
}


  // task management

  findTaskById(taskId: string): Task | undefined {
    return this.tasks.find(task => 
      task.getId() === taskId
    );
  }

  addTask(task: Task): Task {
    // Check if task already in script
    const existingTask = this.findTaskById(task.getId());
    if (existingTask) {
      throw new Error('Task already in script');
    }

    this.tasks.push(task);
    return task;
  }

  
 removeTask(taskId: string): boolean {
    const index = this.tasks.findIndex(task => 
      task.getId() === taskId
    );
    
    if (index === -1) {
      return false;
    }

    this.tasks.splice(index, 1);
    return true;
  }

  update(data: Partial<{ title: any; tasks: any }>) {
    if (data.title !== undefined) this.title = data.title;
    if (data.tasks !== undefined) this.tasks = data.tasks;
  }

}