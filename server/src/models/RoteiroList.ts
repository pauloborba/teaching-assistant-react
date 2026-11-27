import { Roteiro } from './Roteiro';

export class RoteiroList {
  private roteiros: Roteiro[] = [];

  public add(roteiro: Roteiro): Roteiro {
    this.roteiros.push(roteiro);
    return roteiro;
  }

  public update(roteiroAtualizado: Roteiro): Roteiro {
    const index = this.roteiros.findIndex((r) => r.id === roteiroAtualizado.id);
    if (index === -1) {
      throw new Error('Roteiro não encontrado');
    }
    this.roteiros[index] = roteiroAtualizado;
    return roteiroAtualizado;
  }

  public remove(roteiroOuId: Roteiro | string): boolean {
    const idAlvo = typeof roteiroOuId === 'string' ? roteiroOuId : roteiroOuId.id;
    const tamanhoAnterior = this.roteiros.length;
    this.roteiros = this.roteiros.filter((r) => r.id !== idAlvo);
    return this.roteiros.length < tamanhoAnterior;
  }

  public findById(id: string): Roteiro | undefined {
    return this.roteiros.find((r) => r.id === id);
  }

  public findByTitulo(titulo: string, turmaId: string): Roteiro | undefined {
    const tituloNormalizado = titulo.trim().toLowerCase();
    return this.roteiros.find(
      (r) =>
        r.getTitulo().trim().toLowerCase() === tituloNormalizado &&
        r.usadoPelaTurma(turmaId)
    );
  }

  public listByTitulo(turma?: string): Roteiro[] {
    const lista = turma
      ? this.roteiros.filter((r) => r.usadoPelaTurma(turma))
      : [...this.roteiros];

    return lista.sort((a, b) =>
      a.getTitulo().localeCompare(b.getTitulo(), 'pt-BR', { sensitivity: 'base' })
    );
  }

  public getAll(): Roteiro[] {
    return [...this.roteiros];
  }

  public clear(): void {
    this.roteiros = [];
  }
}