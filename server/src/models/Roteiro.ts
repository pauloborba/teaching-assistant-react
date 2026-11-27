export interface RoteiroProps {
  id?: string;
  titulo: string;
  descricao?: string;
  dataAbertura: string; // ISO 8601 (o RoteiroService converte DD/MM/AAAA)
  prazoEntrega: string; // ISO 8601 (o RoteiroService converte DD/MM/AAAA)
  questaoIds?: string[];
  turmaIds?: string[]; 
}

export class Roteiro {
  public readonly id: string;
  private _titulo: string;
  private _descricao: string;
  private _dataAbertura: string;
  private _prazoEntrega: string;
  private _questaoIds: string[];
  private _turmaIds: string[];

  constructor(props: RoteiroProps) {
    this.id = props.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this._titulo = (props.titulo ?? '').trim();
    this._descricao = (props.descricao ?? '').trim();
    this._dataAbertura = (props.dataAbertura ?? '').trim();
    this._prazoEntrega = (props.prazoEntrega ?? '').trim();
    this._questaoIds = Roteiro.limparIds(props.questaoIds);
    this._turmaIds = Roteiro.limparIds(props.turmaIds);
  }

  public getId(): string {
    return this.id;
  }

  public getTitulo(): string {
    return this._titulo;
  }

  public setTitulo(titulo: string): void {
    this._titulo = titulo.trim();
  }

  public getDescricao(): string {
    return this._descricao;
  }

  public setDescricao(descricao: string): void {
    this._descricao = descricao.trim();
  }

  public getDataAbertura(): string {
    return this._dataAbertura;
  }

  public setDataAbertura(dataAbertura: string): void {
    this._dataAbertura = dataAbertura.trim();
  }

  public getPrazoEntrega(): string {
    return this._prazoEntrega;
  }

  public setPrazoEntrega(prazoEntrega: string): void {
    this._prazoEntrega = prazoEntrega.trim();
  }

  public getQuestaoIds(): string[] {
    return [...this._questaoIds];
  }

  public setQuestaoIds(questaoIds: string[]): void {
    this._questaoIds = Roteiro.limparIds(questaoIds);
  }

  public getTotalQuestoes(): number {
    return this._questaoIds.length;
  }

  public getTurmaIds(): string[] {
    return [...this._turmaIds];
  }

  public setTurmaIds(turmaIds: string[]): void {
    this._turmaIds = Roteiro.limparIds(turmaIds);
  }

  public usadoPelaTurma(turmaId: string): boolean {
    return this._turmaIds.includes(turmaId.trim());
  }

  // Datas vazias ou inválidas: o roteiro não é considerado aberto.
  public aindaNaoAbriu(agora: Date): boolean {
    const abertura = Date.parse(this._dataAbertura);
    return Number.isNaN(abertura) || agora.getTime() < abertura;
  }

  public prazoEncerrado(agora: Date): boolean {
    const prazo = Date.parse(this._prazoEntrega);
    return Number.isNaN(prazo) || agora.getTime() > prazo;
  }

  public aberto(agora: Date): boolean {
    return !this.aindaNaoAbriu(agora) && !this.prazoEncerrado(agora);
  }

  public toJSON() {
    return {
      id: this.id,
      titulo: this._titulo,
      descricao: this._descricao,
      dataAbertura: this._dataAbertura,
      prazoEntrega: this._prazoEntrega,
      questaoIds: [...this._questaoIds],
      turmaIds: [...this._turmaIds],
    };
  }

  public static fromJSON(data: any): Roteiro {
    return new Roteiro({
      id: data?.id,
      titulo: data?.titulo ?? '',
      descricao: data?.descricao ?? '',
      dataAbertura: data?.dataAbertura ?? '',
      prazoEntrega: data?.prazoEntrega ?? '',
      questaoIds: Array.isArray(data?.questaoIds) ? data.questaoIds : [],
      turmaIds: Array.isArray(data?.turmaIds) ? data.turmaIds : [],
    });
  }

  private static limparIds(ids?: string[]): string[] {
    return (ids ?? []).map((id) => String(id).trim()).filter((id) => id.length > 0);
  }
}
