import { Roteiro } from './Roteiro';

export class RoteiroList {
  private roteiros: Roteiro[] = [];

  add(roteiro: Roteiro): Roteiro {
    if (this.findById(roteiro.getId())) {
      throw new Error('Já existe um roteiro com este id');
    }
    this.roteiros.push(roteiro);
    return roteiro;
  }

  findById(id: string): Roteiro | undefined {
    return this.roteiros.find(r => r.getId() === id);
  }

  listByTurma(turmaId: string): Roteiro[] {
    return this.roteiros.filter(r => r.usadoPelaTurma(turmaId));
  }

  getAll(): Roteiro[] {
    return [...this.roteiros];
  }
  
  clear(): void {
    this.roteiros = [];
  }
}