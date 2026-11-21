/** Resultado do processamento: Enviado/Falha é uma tentativa de envio, Ignorado é processamento sem envio. */
export type ResultadoNotificacao = 'Enviado' | 'Falha' | 'Ignorado';

type PendenciaRegistrada = {
  nomeAluno: string;
  meta: string;
};

interface ContextoNotificacaoLembrete {
  lembreteId: string;
  turmaRegistrada: string;
  prazoRegistrado: Date;
  pendenciasRegistradas: readonly PendenciaRegistrada[];
}

/** Preserva o contexto de uma notificação de grupo ou de lembrete. */
export class Notificacao {
  readonly grupoRegistrado: string | null;
  readonly turmaRegistrada: string | null;
  readonly lembreteId: string | null;
  private readonly prazoRegistradoEmMs: number | null;
  private readonly pendencias: PendenciaRegistrada[];

  constructor(
    readonly id: number,
    readonly nomeDestinatario: string,
    contexto: string | ContextoNotificacaoLembrete,
    readonly dataHora: Date,
    readonly resultado: ResultadoNotificacao,
    readonly motivo: string,
    readonly descricaoFalha?: string
  ) {
    const lembrete = typeof contexto === 'string' ? null : contexto;
    this.grupoRegistrado = typeof contexto === 'string' ? contexto : null;
    this.turmaRegistrada = lembrete?.turmaRegistrada ?? null;
    this.lembreteId = lembrete?.lembreteId ?? null;

    // Guarda o instante e apenas os dados que apareceram no aviso.
    this.prazoRegistradoEmMs = lembrete?.prazoRegistrado.getTime() ?? null;
    this.pendencias = lembrete?.pendenciasRegistradas.map(({ nomeAluno, meta }) => ({
      nomeAluno, meta
    })) ?? [];
  }

  get prazoRegistrado(): Date | null {
    // Cada consulta recebe uma data própria e preserva o instante guardado.
    return this.prazoRegistradoEmMs === null ? null : new Date(this.prazoRegistradoEmMs);
  }

  get pendenciasRegistradas(): PendenciaRegistrada[] {
    // A lista e seus itens podem ser lidos sem expor os objetos guardados.
    return this.pendencias.map(pendencia => ({ ...pendencia }));
  }
}
