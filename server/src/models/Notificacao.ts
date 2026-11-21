/** Resultado do processamento: Enviado/Falha é uma tentativa de envio, Ignorado é processamento sem envio. */
export type ResultadoNotificacao = 'Enviado' | 'Falha' | 'Ignorado';

type PendenciaRegistrada = {
  nomeAluno: string;
  meta: string;
};

const pendenciaValida = (valor: unknown): valor is PendenciaRegistrada =>
  typeof valor === 'object' && valor !== null &&
  'nomeAluno' in valor && typeof valor.nomeAluno === 'string' &&
  'meta' in valor && typeof valor.meta === 'string';

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

  toJSON() {
    return {
      id: this.id,
      nomeDestinatario: this.nomeDestinatario,
      grupoRegistrado: this.grupoRegistrado,
      turmaRegistrada: this.turmaRegistrada,
      lembreteId: this.lembreteId,
      dataHora: this.dataHora.toISOString(),
      resultado: this.resultado,
      motivo: this.motivo,
      descricaoFalha: this.descricaoFalha,
      prazoRegistrado: this.prazoRegistrado?.toISOString() ?? null,
      pendenciasRegistradas: this.pendenciasRegistradas
    };
  }

  static fromJSON(dados: unknown): Notificacao {
    if (typeof dados !== 'object' || dados === null) {
      throw new Error('Registro de notificação inválido');
    }

    const registro = dados as Record<string, unknown>;
    const { id, nomeDestinatario, resultado, motivo, descricaoFalha } = registro;
    if (
      typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1 ||
      typeof nomeDestinatario !== 'string' || typeof motivo !== 'string' ||
      (resultado !== 'Enviado' && resultado !== 'Falha' && resultado !== 'Ignorado') ||
      (descricaoFalha !== undefined && typeof descricaoFalha !== 'string') ||
      typeof registro.dataHora !== 'string'
    ) {
      throw new Error('Registro de notificação inválido');
    }

    const dataHora = new Date(registro.dataHora);
    if (!Number.isFinite(dataHora.getTime())) {
      throw new Error('Data da notificação inválida');
    }

    if (typeof registro.grupoRegistrado === 'string') {
      return new Notificacao(id, nomeDestinatario, registro.grupoRegistrado, dataHora, resultado, motivo, descricaoFalha);
    }

    const { lembreteId, turmaRegistrada, prazoRegistrado, pendenciasRegistradas } = registro;
    if (
      typeof lembreteId !== 'string' || typeof turmaRegistrada !== 'string' ||
      typeof prazoRegistrado !== 'string' || !Array.isArray(pendenciasRegistradas) ||
      !pendenciasRegistradas.every(pendenciaValida)
    ) {
      throw new Error('Contexto de notificação de lembrete inválido');
    }

    const prazo = new Date(prazoRegistrado);
    if (!Number.isFinite(prazo.getTime())) {
      throw new Error('Prazo registrado inválido');
    }

    // Reconstrói o aviso com os dados históricos, sem consultar as notas atuais.
    return new Notificacao(id, nomeDestinatario, {
      lembreteId, turmaRegistrada, prazoRegistrado: prazo, pendenciasRegistradas
    }, dataHora, resultado, motivo, descricaoFalha);
  }
}
