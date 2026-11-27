import { Questao } from './Questao';

export class QuestaoList {
  private questoes: Questao[] = [];

  add(questao: Questao): Questao {
    if (this.findById(questao.getId())) {
      throw new Error('Já existe uma questão com este id');
    }
    this.questoes.push(questao);
    return questao;
  }

  findById(id: string): Questao | undefined {
    return this.questoes.find(q => q.getId() === id);
  }

  getAll(): Questao[] {
    return [...this.questoes]; // Return a copy to prevent external modification
  }

  clear(): void {
    this.questoes = [];
  }
}