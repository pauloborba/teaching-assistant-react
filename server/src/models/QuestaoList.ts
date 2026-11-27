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

  update(questao: Questao): Questao {
    const index = this.questoes.findIndex(q => q.getId() === questao.getId());
    if (index === -1) {
      throw new Error('Questão não encontrada');
    }
    this.questoes[index] = questao;
    return questao;
  }

  remove(id: string): boolean {
    const tamanhoAnterior = this.questoes.length;
    this.questoes = this.questoes.filter(q => q.getId() !== id);
    return this.questoes.length < tamanhoAnterior;
  }

  getAll(): Questao[] {
    return [...this.questoes]; // Return a copy to prevent external modification
  }

  clear(): void {
    this.questoes = [];
  }
}