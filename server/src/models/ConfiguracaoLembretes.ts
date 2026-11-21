import { Lembrete, LembreteProposto } from './Lembrete';

export class ConfiguracaoLembretes {
  private lembretes: Lembrete[];

  constructor(lembretes: readonly Lembrete[] = []) {
    ConfiguracaoLembretes.validarIdentificadores(lembretes.map(lembrete => lembrete.getId()));
    this.lembretes = lembretes.map(lembrete => lembrete.copiar()); // Não mantém referências que permitam modificar a configuração externamente.
  }

  listar(): Lembrete[] {
    return this.lembretes.map(lembrete => lembrete.copiar()); // A quantidade é derivada desta lista; não existe um atributo de quantidade separado.
  }

  toJSON() {
    return this.lembretes.map(lembrete => lembrete.toJSON()); // Delega a conversão de cada entidade ao próprio modelo.
  }

  static fromJSON(dados: unknown): ConfiguracaoLembretes {
    if (dados === undefined) return new ConfiguracaoLembretes(); // Mantém compatibilidade com arquivos antigos sem lembretes.
    if (!Array.isArray(dados)) throw new Error('Configuração de lembretes persistida inválida');
    const lembretes = dados.map(registro => Lembrete.fromJSON(registro)); // Recupera identidades, agendamentos e estados.
    return new ConfiguracaoLembretes(lembretes); // O construtor também rejeita identidades duplicadas.
  }

  add(lembrete: Lembrete): void { // Adiciona uma entidade já preparada; a entrada de configuração deve usar atualizar para validar o conjunto completo.
    ConfiguracaoLembretes.validarIdentificadores([...this.lembretes.map(item => item.getId()), lembrete.getId()]);
    this.lembretes.push(lembrete.copiar());
  }

  remove(lembrete: Lembrete): void {
    const index = this.lembretes.findIndex(item => item.getId() === lembrete.getId());
    if (index === -1) throw new Error('Lembrete não encontrado na configuração');
    ConfiguracaoLembretes.validarEdicao(this.lembretes[index]); // Verifica a entidade armazenada, não o estado fornecido no argumento.
    this.lembretes.splice(index, 1);
  }

  marcarComoEnviado(id: string): void {
    this.obterLembreteArmazenado(id).marcarComoEnviado();
  }

  ignorar(id: string, motivo: string): void {
    this.obterLembreteArmazenado(id).ignorar(motivo);
  }

  private obterLembreteArmazenado(id: string): Lembrete {
    // Atualiza a entidade guardada pela configuração. As buscas públicas devolvem cópias.
    const lembrete = this.lembretes.find(item => item.getId() === id);
    if (!lembrete) throw new Error('Lembrete não encontrado na configuração');
    return lembrete;
  }

  buscarLembretesPara(data: string, horario: string): Lembrete[] {
    return this.lembretes
      .filter(lembrete => lembrete.getData() === data && lembrete.getHorario() === horario)
      .map(lembrete => lembrete.copiar()); // Datas iguais não tornam identidades diferentes duplicadas; a busca não filtra estados.
  }

  possuiAgendamentosPendentesApos(novoPrazo: Date): boolean {
    if (!Number.isFinite(novoPrazo.getTime())) throw new Error('Prazo acadêmico inválido');
    return this.lembretes.some(lembrete => {
      if (lembrete.getEstado() !== 'Não enviado' && lembrete.getEstado() !== 'Agendado') return false;
      const reenvio = lembrete.getProximoReenvioEm();
      return lembrete.getAgendamento().getTime() > novoPrazo.getTime()
        || (reenvio !== null && reenvio.getTime() > novoPrazo.getTime());
    }); // Consulta agendamento e reenvio dos pendentes sem alterar estados, consultar o relógio ou processar envios.
  }

  atualizar(quantidade: number, propostas: readonly LembreteProposto[], instanteAtual: Date, prazoAcademico: Date): void {
    if (!Number.isSafeInteger(quantidade) || quantidade < 0) throw new Error('Quantidade de lembretes inválida');
    if (propostas.length !== quantidade || propostas.some(proposta => !proposta.data || !proposta.horario)) {
      throw new Error(`Selecione exatamente ${quantidade} datas e horários`);
    }
    if (!Number.isFinite(instanteAtual.getTime())) throw new Error('Instante atual inválido');
    if (!Number.isFinite(prazoAcademico.getTime())) throw new Error('Prazo acadêmico inválido');
    ConfiguracaoLembretes.validarIdentificadores(propostas.map(proposta => proposta.id));

    const anteriores = new Map(this.lembretes.map(lembrete => [lembrete.getId(), lembrete]));
    const propostasPorId = new Map(propostas.map(proposta => [proposta.id, proposta]));
    for (const anterior of this.lembretes) {
      const proposta = propostasPorId.get(anterior.getId());
      if (!proposta || proposta.data !== anterior.getData() || proposta.horario !== anterior.getHorario()) {
        ConfiguracaoLembretes.validarEdicao(anterior); // Uma exclusão ou alteração deve preservar os enviados e os estados ainda sem regra de edição.
      }
    }

    if (instanteAtual.getTime() > prazoAcademico.getTime() && propostas.some(proposta => !anteriores.has(proposta.id))) {
      throw new Error('Prazo acadêmico encerrado'); // Bloqueia novas criações; não cria uma restrição adicional para propostas sem novos lembretes.
    }

    const candidatos = propostas.map(proposta => {
      const anterior = anteriores.get(proposta.id);
      if (!anterior) return Lembrete.criar(proposta, instanteAtual, prazoAcademico);
      const candidato = anterior.copiar();
      if (proposta.data !== anterior.getData() || proposta.horario !== anterior.getHorario()) {
        candidato.reagendar(proposta.data, proposta.horario, instanteAtual, prazoAcademico);
      }
      return candidato; // Agendamentos existentes inalterados não são rejeitados apenas por terem passado do horário.
    });

    this.lembretes = candidatos; // Aplica o conjunto somente depois de validar todos os candidatos; uma falha anterior não altera a configuração.
  }

  private static validarIdentificadores(ids: readonly string[]): void {
    if (ids.some(id => typeof id !== 'string' || !id.trim())) throw new Error('Identificador do lembrete inválido');
    if (new Set(ids).size !== ids.length) throw new Error('Identificador de lembrete duplicado');
  }

  private static validarEdicao(lembrete: Lembrete): void {
    if (lembrete.jaFoiEnviado()) throw new Error('Lembretes enviados não podem ser alterados');
    if (lembrete.getEstado() === 'Ignorado' || lembrete.getEstado() === 'Cancelado') {
      throw new Error('Edição de lembretes ignorados ou cancelados ainda não disponível'); // A regra desses estados continua pendente no DDD; não permite descartá-los silenciosamente.
    }
  }
}
