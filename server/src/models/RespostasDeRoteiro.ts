import { Roteiro } from './Roteiro';
import { RespostasDeAvaliacao } from './RespostasDeAvaliacao';

// Formato do resultado de calcularDesempenho(): as médias da turma no roteiro.
// Não é uma entidade nem um value object do DDD; só descreve os dados devolvidos.
export interface Desempenho {
  mediaAcertos: number;
  mediaErros: number;
  mediaTempoEntrega: number;
}

export const MENSAGEM_SEM_RESULTADOS = 'A turma não tem resultados nesse roteiro';

// Média arredondada para 2 casas decimais
export function media(valores: number[]): number {
  const soma = valores.reduce((total, valor) => total + valor, 0);
  return Math.round((soma / valores.length) * 100) / 100;
}

// Resultados de uma turma em um roteiro (entity)
export class RespostasDeRoteiro {
  private readonly roteiro: Roteiro;
  private avaliacoes: RespostasDeAvaliacao[] = [];

  constructor(roteiro: Roteiro) {
    this.roteiro = roteiro;
  }

  getRoteiro(): Roteiro {
    return this.roteiro;
  }

  getAvaliacoes(): RespostasDeAvaliacao[] {
    return [...this.avaliacoes];
  }

  // Cada aluno tem um único resultado por roteiro: um novo resultado substitui o anterior
  addAvaliacao(avaliacao: RespostasDeAvaliacao): void {
    const cpf = avaliacao.getAluno().getCPF();
    this.avaliacoes = this.avaliacoes.filter(a => a.getAluno().getCPF() !== cpf);
    this.avaliacoes.push(avaliacao);
  }

  temResultados(): boolean {
    return this.avaliacoes.length > 0;
  }

  calcularDesempenho(): Desempenho {
    if (!this.temResultados()) {
      throw new Error(MENSAGEM_SEM_RESULTADOS);
    }
    return {
      mediaAcertos: media(this.avaliacoes.map(a => a.getAcertos())),
      mediaErros: media(this.avaliacoes.map(a => a.getErros())),
      mediaTempoEntrega: media(this.avaliacoes.map(a => a.getTempoEntrega()))
    };
  }

  toJSON() {
    return {
      roteiro: this.roteiro.getTitulo(),
      avaliacoes: this.avaliacoes.map(a => a.toJSON())
    };
  }
}
