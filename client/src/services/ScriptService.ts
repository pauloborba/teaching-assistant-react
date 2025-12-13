import { CreateScriptRequest, Script, UpdateScriptRequest } from '../types/Script';

class ScriptService {
  private readonly baseUrl = 'http://localhost:3005/api/scripts';

  async createScript(data: CreateScriptRequest): Promise<Script> {
    const res = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to create script: ${res.statusText}`);
    }

    return await res.json();
  }

  async getAllScripts(): Promise<Script[]> {
    const res = await fetch(this.baseUrl);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load scripts: ${res.statusText}`);
    }
    return await res.json();
  }

  async getScriptById(id: string): Promise<Script> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to load script: ${res.statusText}`);
    }
    return await res.json();
  }

  async updateScript(id: string, data: UpdateScriptRequest): Promise<Script> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to update script: ${res.statusText}`);
    }

    return await res.json();
  }
}

export default new ScriptService();
