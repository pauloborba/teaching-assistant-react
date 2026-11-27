export class Roteiro {
  private readonly id: string;
  private titulo: string;
  private descricao: string;
  private dataAbertura: Date;
  private prazoEntrega: Date;
  private questaoIds: string[];
  private turmaIds: string[];

  constructor(
    id: string,
    titulo: string,
    dataAbertura: Date,
    prazoEntrega: Date,
    questaoIds: string[],
    turmaIds: string[],
    descricao: string = ''
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('Id do roteiro é obrigatório');
    }
    if (!titulo || titulo.trim().length === 0) {
      throw new Error('Título do roteiro é obrigatório');
    }
    if (isNaN(dataAbertura.getTime()) || isNaN(prazoEntrega.getTime())) {
      throw new Error('Datas do roteiro inválidas');
    }
    if (dataAbertura.getTime() >= prazoEntrega.getTime()) {
      throw new Error('A data de abertura deve ser anterior ao prazo de entrega');
    }
    if (!questaoIds || questaoIds.length === 0) {
      throw new Error('O roteiro precisa de pelo menos uma questão');
    }
    if (new Set(questaoIds).size !== questaoIds.length) {
      throw new Error('O roteiro não pode repetir questões');
    }
    if (!turmaIds || turmaIds.length === 0) {
      throw new Error('O roteiro precisa de pelo menos uma turma');
    }

    this.id = id;
    this.titulo = titulo.trim();
    this.descricao = descricao;
    this.dataAbertura = dataAbertura;
    this.prazoEntrega = prazoEntrega;
    this.questaoIds = [...questaoIds];
    this.turmaIds = [...turmaIds];
  }

  // Getters
  getId(): string {
    return this.id;
  }

  getTitulo(): string {
    return this.titulo;
  }

  getDescricao(): string {
    return this.descricao;
  }

  getDataAbertura(): Date {
    return this.dataAbertura;
  }

  getPrazoEntrega(): Date {
    return this.prazoEntrega;
  }

  // A ordem da lista é a ordem das questões no roteiro
  getQuestaoIds(): string[] {
    return [...this.questaoIds];
  }

  getTurmaIds(): string[] {
    return [...this.turmaIds];
  }

  getTotalQuestoes(): number {
    return this.questaoIds.length;
  }

  // Regras de prazo 
  aindaNaoAbriu(agora: Date): boolean {
    return agora.getTime() < this.dataAbertura.getTime();
  }

  prazoEncerrado(agora: Date): boolean {
    return agora.getTime() > this.prazoEntrega.getTime();
  }

  aberto(agora: Date): boolean {
    return !this.aindaNaoAbriu(agora) && !this.prazoEncerrado(agora);
  }

  usadoPelaTurma(turmaId: string): boolean {
    return this.turmaIds.includes(turmaId);
  }

  toJSON() {
    return {
      id: this.id,
      titulo: this.titulo,
      descricao: this.descricao,
      dataAbertura: this.dataAbertura.toISOString(),
      prazoEntrega: this.prazoEntrega.toISOString(),
      questaoIds: [...this.questaoIds],
      turmaIds: [...this.turmaIds]
    };
  }

  static fromJSON(data: {
    id: string;
    titulo: string;
    descricao?: string;
    dataAbertura: string;
    prazoEntrega: string;
    questaoIds: string[];
    turmaIds: string[];
  }): Roteiro {
    return new Roteiro(
      data.id,
      data.titulo,
      new Date(data.dataAbertura),
      new Date(data.prazoEntrega),
      data.questaoIds,
      data.turmaIds,
      data.descricao ?? ''
    );
  }
}