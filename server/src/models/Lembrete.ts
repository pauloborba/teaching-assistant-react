export type EstadoLembrete = 'Não enviado' | 'Agendado' | 'Enviado' | 'Ignorado' | 'Cancelado';

export interface LembreteProposto { // Dados do conjunto pretendido; identidade e agendamento não permitem editar o estado de envio.
  id: string;
  data: string;
  horario: string;
}

export interface RegistroLembrete extends LembreteProposto { // Permite reconstruir registros existentes sem reaplicar as regras de um novo agendamento.
  estado?: EstadoLembrete;
  motivo?: string | null;
  proximoReenvioEm?: Date | null;
}

export class Lembrete {
  private readonly id: string;
  private data: string; // Data UTC no formato YYYY-MM-DD; a conversão do horário local pertence à fronteira da aplicação.
  private horario: string; // Horário UTC no formato HH:mm, com a mesma precisão dos campos atuais da GUI.
  private estado: EstadoLembrete;
  private motivo: string | null;
  private proximoReenvioEm: Date | null;

  constructor(registro: RegistroLembrete) {
    if (typeof registro.id !== 'string' || !registro.id.trim()) {
      throw new Error('Identificador do lembrete inválido');
    }

    Lembrete.obterInstante(registro.data, registro.horario); // Confere a estrutura do agendamento, inclusive datas inexistentes no calendário.
    const estado = registro.estado ?? 'Não enviado'; // Mantém o estado usado nos cenários GUI sem unificá-lo com Agendado.
    const estados: EstadoLembrete[] = ['Não enviado', 'Agendado', 'Enviado', 'Ignorado', 'Cancelado'];
    if (!estados.includes(estado)) throw new Error('Estado do lembrete inválido');
    if (registro.proximoReenvioEm != null && !Number.isFinite(registro.proximoReenvioEm.getTime())) {
      throw new Error('Data do reenvio inválida');
    }

    this.id = registro.id;
    this.data = registro.data;
    this.horario = registro.horario;
    this.estado = estado;
    this.motivo = registro.motivo ?? null;
    this.proximoReenvioEm = registro.proximoReenvioEm == null ? null : new Date(registro.proximoReenvioEm.getTime());
  }

  static criar(proposta: LembreteProposto, instanteAtual: Date, prazoAcademico: Date): Lembrete {
    Lembrete.validarAgendamento(proposta.data, proposta.horario, instanteAtual, prazoAcademico); // Valida antes de criar um novo lembrete de configuração.
    return new Lembrete({ id: proposta.id, data: proposta.data, horario: proposta.horario }); // Copia somente os dados de configuração; um novo lembrete sempre começa como Não enviado.
  }

  getId(): string { return this.id; }
  getData(): string { return this.data; }
  getHorario(): string { return this.horario; }
  getEstado(): EstadoLembrete { return this.estado; }
  getMotivo(): string | null { return this.motivo; }
  jaFoiEnviado(): boolean { return this.estado === 'Enviado'; }

  marcarComoEnviado(): void {
    if (this.jaFoiEnviado()) return;

    if (this.estado !== 'Não enviado' && this.estado !== 'Agendado') {
      throw new Error('Lembrete neste estado não pode ser marcado como enviado');
    }

    this.estado = 'Enviado';
    this.proximoReenvioEm = null; // A aceitação do envio encerra o reenvio programado.
  }

  ignorar(motivo: string): void {
    if ((this.estado !== 'Não enviado' && this.estado !== 'Agendado') ||
      this.proximoReenvioEm !== null) {
      throw new Error('Somente lembretes aguardando o primeiro envio podem ser ignorados');
    }

    // Encerra o lembrete com o motivo do processamento, preservando ID, data e horário.
    this.estado = 'Ignorado';
    this.motivo = motivo;
  }

  programarReenvio(dataHora: Date): void {
    if (this.estado !== 'Não enviado' && this.estado !== 'Agendado') {
      throw new Error('Somente lembretes aguardando envio podem ser reprogramados');
    }
    if (!Number.isFinite(dataHora.getTime())) throw new Error('Data do reenvio inválida');
    this.proximoReenvioEm = new Date(dataHora.getTime()); // Conserva o agendamento original.
  }

  cancelar(motivo: string): void {
    if (this.proximoReenvioEm === null || (this.estado !== 'Não enviado' && this.estado !== 'Agendado')) {
      throw new Error('O lembrete não aguarda reenvio');
    }
    this.estado = 'Cancelado';
    this.motivo = motivo;
    this.proximoReenvioEm = null;
  }

  getAgendamento(): Date {
    return Lembrete.obterInstante(this.data, this.horario); // Retorna um novo Date para impedir alterações externas no agendamento.
  }

  getProximoReenvioEm(): Date | null {
    return this.proximoReenvioEm === null ? null : new Date(this.proximoReenvioEm.getTime());
  }

  reagendar(novaData: string, novoHorario: string, instanteAtual: Date, prazoAcademico: Date): void {
    if (this.jaFoiEnviado()) throw new Error('Lembretes enviados não podem ser alterados');
    if (this.estado === 'Ignorado' || this.estado === 'Cancelado') {
      throw new Error('Edição de lembretes ignorados ou cancelados ainda não disponível'); // Preserva estados cuja regra de edição está pendente no DDD.
    }

    Lembrete.validarAgendamento(novaData, novoHorario, instanteAtual, prazoAcademico);
    this.data = novaData; // Só modifica o agendamento após todas as validações; identidade e estado permanecem intactos.
    this.horario = novoHorario;
  }

  copiar(): Lembrete { // Produz uma cópia com a mesma identidade para consultas e preparação de alterações sem efeitos parciais.
    return new Lembrete({
      id: this.id,
      data: this.data,
      horario: this.horario,
      estado: this.estado,
      motivo: this.motivo,
      proximoReenvioEm: this.proximoReenvioEm
    });
  }

  toJSON() {
    return {
      id: this.id,
      data: this.data, // Mantém a data UTC usada pelo domínio.
      horario: this.horario, // Mantém o horário UTC com precisão de minutos.
      estado: this.estado,
      motivo: this.motivo,
      proximoReenvioEm: this.proximoReenvioEm?.toISOString() ?? null // Converte Date para texto ISO no JSON.
    };
  }

  static fromJSON(dados: unknown): Lembrete {
    if (typeof dados !== 'object' || dados === null) {
      throw new Error('Registro de lembrete persistido inválido');
    }
    const registro = dados as Record<string, unknown>; // Permite conferir os campos recebidos antes de reconstruir a entidade.
    if (
      typeof registro.id !== 'string' || typeof registro.data !== 'string'
      || typeof registro.horario !== 'string' || typeof registro.estado !== 'string'
      || (registro.motivo !== null && typeof registro.motivo !== 'string')
      || (registro.proximoReenvioEm !== null && typeof registro.proximoReenvioEm !== 'string')
    ) {
      throw new Error('Registro de lembrete persistido inválido');
    }

    return new Lembrete({
      id: registro.id,
      data: registro.data,
      horario: registro.horario,
      estado: registro.estado as EstadoLembrete, // O construtor valida se o texto corresponde a um estado permitido.
      motivo: registro.motivo,
      proximoReenvioEm: registro.proximoReenvioEm === null
        ? null
        : new Date(registro.proximoReenvioEm) // Recupera o instante do reenvio a partir do texto ISO.
    }); // Reconstrói dados históricos sem exigir que o agendamento esteja no futuro.
  }

  private static obterInstante(data: string, horario: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(horario)) {
      throw new Error('Data ou horário do lembrete inválido');
    }
    const iso = `${data}T${horario}:00.000Z`;
    const instante = new Date(iso);
    if (!Number.isFinite(instante.getTime()) || instante.toISOString() !== iso) {
      throw new Error('Data ou horário do lembrete inválido'); // A comparação também rejeita datas que Date normalizaria, como 30 de fevereiro.
    }
    return instante;
  }

  private static validarAgendamento(data: string, horario: string, instanteAtual: Date, prazoAcademico: Date): void {
    if (!Number.isFinite(instanteAtual.getTime())) throw new Error('Instante atual inválido');
    if (!Number.isFinite(prazoAcademico.getTime())) throw new Error('Prazo acadêmico inválido');
    const agendamento = Lembrete.obterInstante(data, horario);
    if (agendamento.getTime() < instanteAtual.getTime()) {
      throw new Error('Não é possível agendar lembretes em datas anteriores à data atual');
    }
    if (agendamento.getTime() > prazoAcademico.getTime()) throw new Error('Data posterior ao prazo acadêmico');
  }
}
