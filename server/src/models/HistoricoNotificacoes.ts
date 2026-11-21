import { Notificacao } from './Notificacao';

/** Histórico das notificações já processadas, na ordem em que foram registradas. */
export class HistoricoNotificacoes {
  private notificacoes: Notificacao[] = [];
  private ultimoId = 0;

  /** Identidade para a próxima Notificacao a registrar. */
  proximoId(): number {
    return ++this.ultimoId;
  }

  registrar(notificacao: Notificacao): void {
    this.notificacoes.push(notificacao);
  }

  listar(): Notificacao[] {
    return [...this.notificacoes];
  }

  listarDoGrupo(grupo: string): Notificacao[] {
    return this.notificacoes.filter(n => n.grupoRegistrado === grupo);
  }

  buscar(idNotificacao: number): Notificacao | undefined {
    return this.notificacoes.find(n => n.id === idNotificacao);
  }

  toJSON() {
    return this.notificacoes.map(notificacao => notificacao.toJSON());
  }

  restaurar(dados: unknown): void {
    // Arquivos anteriores a este incremento começam com histórico vazio.
    if (dados !== undefined && !Array.isArray(dados)) {
      throw new Error('Histórico de notificações inválido');
    }

    const registros = (dados ?? []).map(Notificacao.fromJSON);
    const ids = new Set(registros.map(registro => registro.id));
    if (ids.size !== registros.length) {
      throw new Error('Identificador de notificação duplicado no histórico');
    }

    // Substitui o histórico somente após validar todos os registros.
    this.notificacoes = registros;
    this.ultimoId = registros.reduce((maior, registro) => Math.max(maior, registro.id), 0);
  }

  limpar(): void {
    this.notificacoes = [];
    this.ultimoId = 0;
  }
}
