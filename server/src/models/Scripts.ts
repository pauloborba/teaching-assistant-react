import { Script } from './Script';
import { Task } from './Task';

export class Scripts {
  private items: Script[] = [];

addScript(data: any): Script {
  const id = data.id ?? Date.now().toString();
  if (data.title === undefined || data.title.trim() === '') {
    throw new Error('Script title is required');
  }
  const equalScripts = this.findByName(data.title);
  if (equalScripts) {
    throw new Error('Script with this title already exists');
  }
  const script = new Script(id, data.title);

  if (Array.isArray(data.tasks)) {
    script.tasks = data.tasks.map((t: any) => Task.fromJSON(t));
  }

  this.items.push(script);
  return script;
}

  getAllScripts(): Script[] {
    return this.items;
  }

  findById(id: string): Script | undefined {
    return this.items.find(s => s.getId() === id);
  }

  findByName(name: string): Script | undefined {
    return this.items.find(s => s.getTitle() === name);
  }

  updateScript(id: string, data: any): Script | undefined {
    const script = this.findById(id);
    if (!script) return undefined;
    script.update(data);
    return script;
  }
  
}