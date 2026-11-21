// Roteiro (entity), com os mesmos atributos do DDD do cadastro de roteiros da equipe:
// id, título, descrição, data de abertura e prazo de entrega.
// O relatório de desempenho só usa o título. Os outros atributos (e as atividades)
// são preenchidos pelo cadastro de roteiros quando ele existir.
export class Roteiro {
  private readonly id: string;
  private titulo: string;
  private descricao: string;
  private dataAbertura?: Date;
  private prazoEntrega?: Date;

  constructor(titulo: string, descricao: string = '', dataAbertura?: Date, prazoEntrega?: Date, id?: string) {
    if (!titulo || titulo.trim().length === 0) {
      throw new Error('Título do roteiro é obrigatório');
    }
    this.titulo = titulo.trim();
    this.descricao = descricao;
    this.dataAbertura = dataAbertura;
    this.prazoEntrega = prazoEntrega;
    // Enquanto o cadastro não gera ids, o título identifica o roteiro dentro da turma
    this.id = id ?? this.titulo;
  }

  getId(): string {
    return this.id;
  }

  getTitulo(): string {
    return this.titulo;
  }

  getDescricao(): string {
    return this.descricao;
  }

  getDataAbertura(): Date | undefined {
    return this.dataAbertura;
  }

  getPrazoEntrega(): Date | undefined {
    return this.prazoEntrega;
  }

  // Compara ignorando espaços sobrando no título pedido
  temTitulo(titulo: string): boolean {
    return this.titulo === titulo.trim();
  }

  toJSON() {
    return {
      id: this.id,
      titulo: this.titulo,
      descricao: this.descricao,
      dataAbertura: this.dataAbertura?.toISOString(),
      prazoEntrega: this.prazoEntrega?.toISOString()
    };
  }
}
