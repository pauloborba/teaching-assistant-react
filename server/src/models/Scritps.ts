import { Script } from './Script';

export class Scripts {
  private items: Script[] = [];

  addScript(data: any): Script {
    const id = data.id ?? Date.now().toString();
    const script = new Script(id, data.title, data.content);
    this.items.push(script);
    return script;
  }

  getAllScripts(): Script[] {
    return this.items;
  }

  findById(id: string): Script | undefined {
    return this.items.find(s => s.getId() === id);
  }

  updateScript(id: string, data: any): Script | undefined {
    const script = this.findById(id);
    if (!script) return undefined;
    script.update(data);
    return script;
  }
  
}