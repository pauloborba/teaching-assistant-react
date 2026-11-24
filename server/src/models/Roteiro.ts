import { Atividade } from './Atividade';

export interface RespostaAluno {
  alunoNome: string;
  resposta?: string;
}

export interface RoteiroProps {
  id?: string;
  titulo: string;
  descricao?: string;
  turma: string;
  dataAbertura: string; // ex.: "10/11/2026" ou ISO
  prazoEntrega: string; // ex.: "17/11/2026" ou ISO
  atividades?: (Atividade | string)[];
  respostas?: RespostaAluno[];
}

export class Roteiro {
  public readonly id: string;
  private _titulo: string;
  private _descricao: string;
  private _turma: string;
  private _dataAbertura: string;
  private _prazoEntrega: string;
  private _atividades: Atividade[];
  private _respostas: RespostaAluno[];

  constructor(props: RoteiroProps) {
    this.id = props.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this._titulo = (props.titulo ?? '').trim();
    this._descricao = (props.descricao ?? '').trim();
    this._turma = (props.turma ?? '').trim();
    this._dataAbertura = (props.dataAbertura ?? '').trim();
    this._prazoEntrega = (props.prazoEntrega ?? '').trim();
    this._atividades = (props.atividades ?? []).map((item) =>
      item instanceof Atividade ? item : new Atividade(String(item))
    );
    this._respostas = props.respostas ? [...props.respostas] : [];
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

  public getTurma(): string {
    return this._turma;
  }

  public setTurma(turma: string): void {
    this._turma = turma.trim();
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

  public getAtividades(): Atividade[] {
    return [...this._atividades];
  }

  public setAtividades(atividades: (Atividade | string)[]): void {
    this._atividades = atividades.map((item) =>
      item instanceof Atividade ? item : new Atividade(String(item))
    );
  }

  public getRespostas(): RespostaAluno[] {
    return [...this._respostas];
  }

  public possuiRespostas(): boolean {
    return this._respostas.length > 0;
  }

  public toJSON() {
    return {
      id: this.id,
      titulo: this._titulo,
      descricao: this._descricao,
      turma: this._turma,
      dataAbertura: this._dataAbertura,
      prazoEntrega: this._prazoEntrega,
      atividades: this._atividades.map((a) => a.toJSON()),
      respostas: this._respostas,
    };
  }

  public static fromJSON(data: any): Roteiro {
    return new Roteiro({
      id: data?.id,
      titulo: data?.titulo ?? '',
      descricao: data?.descricao ?? '',
      turma: data?.turma ?? '',
      dataAbertura: data?.dataAbertura ?? '',
      prazoEntrega: data?.prazoEntrega ?? '',
      atividades: Array.isArray(data?.atividades)
        ? data.atividades.map((a: any) => Atividade.fromJSON(a))
        : [],
      respostas: Array.isArray(data?.respostas) ? data.respostas : [],
    });
  }
}