import { CreateTaskRequest, Task, UpdateTaskRequest } from '../types/Task';

class TaskService {
  private readonly baseUrl = 'http://localhost:3005/api/tasks';

  async createTask(data: CreateTaskRequest): Promise<Task> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create Task: ${res.statusText}`);
    }

    return await res.json();
  }

  async getTaskById(id: string): Promise<Task> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load Task: ${res.statusText}`);
    }
    return await res.json();
  }

  async updateTask(id: string, data: UpdateTaskRequest): Promise<Task> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update Task: ${res.statusText}`);
    }

    return await res.json();
  }
}

export default new TaskService();
