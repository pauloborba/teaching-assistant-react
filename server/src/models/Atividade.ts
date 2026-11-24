export class Atividade {
  private _descricao: string;

  constructor(descricao: string) {
    this._descricao = descricao.trim();
  }

  public getDescricao(): string {
    return this._descricao;
  }

  public setDescricao(descricao: string): void {
    this._descricao = descricao.trim();
  }

  public toJSON() {
    return {
      descricao: this._descricao,
    };
  }

  public static fromJSON(data: any): Atividade {
    return new Atividade(data?.descricao ?? '');
  }
}