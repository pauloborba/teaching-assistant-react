export type TipoQuestao = 'texto' | 'multipla' | 'imagem';

export interface Alternativa {
  id: string;
  texto: string;
}

export class Questao {
  private readonly id: string;
  private enunciado: string;
  private tipo: TipoQuestao;
  private alternativas: Alternativa[] | null;

  constructor(id: string, enunciado: string, tipo: TipoQuestao, alternativas: Alternativa[] | null = null) {
    if (!id || id.trim().length === 0) {
      throw new Error('Id da questão é obrigatório');
    }
    if (!enunciado || enunciado.trim().length === 0) {
      throw new Error('Enunciado da questão é obrigatório');
    }
    if (!['texto', 'multipla', 'imagem'].includes(tipo)) {
      throw new Error('Tipo de questão inválido');
    }
    if (tipo === 'multipla' && (!alternativas || alternativas.length < 2)) {
      throw new Error('Questão de múltipla escolha precisa de pelo menos 2 alternativas');
    }

    this.id = id;
    this.enunciado = enunciado;
    this.tipo = tipo;
    this.alternativas = tipo === 'multipla' && alternativas ? [...alternativas] : null;
  }

  getId(): string {
    return this.id;
  }

  getEnunciado(): string {
    return this.enunciado;
  }

  getTipo(): TipoQuestao {
    return this.tipo;
  }

  getAlternativas(): Alternativa[] | null {
    return this.alternativas ? [...this.alternativas] : null;
  }

  toJSON() {
    return {
      id: this.id,
      enunciado: this.enunciado,
      tipo: this.tipo,
      alternativas: this.alternativas
    };
  }

  static fromJSON(data: { id: string; enunciado: string; tipo: TipoQuestao; alternativas?: Alternativa[] | null }): Questao {
    return new Questao(data.id, data.enunciado, data.tipo, data.alternativas ?? null);
  }
}