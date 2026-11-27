export type StatusResposta = 'respondida' | 'nao_respondida';

export class RespostaQuestao {
  private readonly questaoId: string;
  private readonly valor: string | null;
  private readonly tempo: number;
  private readonly nota: number | null;

  constructor(questaoId: string, valor: string | null, tempo: number, nota: number | null = null) {
    if (!questaoId) {
      throw new Error('Questão da resposta é obrigatória');
    }
    if (typeof tempo !== 'number' || isNaN(tempo) || tempo < 0) {
      throw new Error('Tempo de resposta deve ser um número não negativo');
    }
    this.questaoId = questaoId;
    this.valor = valor === undefined || valor === '' ? null : valor;
    this.tempo = tempo;
    this.nota = nota;
  }

  getQuestaoId(): string {
    return this.questaoId;
  }

  getValor(): string | null {
    return this.valor;
  }

  getTempo(): number {
    return this.tempo;
  }

  getNota(): number | null {
    return this.nota;
  }

  // O status é derivado do valor, então nunca fica inconsistente
  getStatus(): StatusResposta {
    return this.valor !== null ? 'respondida' : 'nao_respondida';
  }

  estaRespondida(): boolean {
    return this.getStatus() === 'respondida';
  }

  toJSON() {
    return {
      questaoId: this.questaoId,
      valor: this.valor,
      tempo: this.tempo,
      status: this.getStatus(),
      nota: this.nota
    };
  }

  static fromJSON(data: { questaoId: string; valor: string | null; tempo: number; nota?: number | null }): RespostaQuestao {
    return new RespostaQuestao(data.questaoId, data.valor, data.tempo, data.nota ?? null);
  }
}