import { EmailSender, EmailSenderSmtp } from './EmailSender';
import { Class } from './Class';
import { Classes } from './Classes';
import { HistoricoNotificacoes } from './HistoricoNotificacoes';
import { Lembrete } from './Lembrete';
import { Notificacao } from './Notificacao';

const INTERVALO_VERIFICACAO_MS = 30_000;
const INTERVALOS_REENVIO_MS = [15_000, 30_000, 45_000];

type DependenciasLembretes = {
  classes: Classes;
  emailSender: Pick<EmailSenderSmtp, 'send'>; // Permite usar o SMTP real ou simular somente a operação de envio.
};

/**
 * Serviço compartilhado de notificações. Para cada destinatário, solicita o
 * envio a EmailSender e registra o resultado em HistoricoNotificacoes.
 */
export class NotificacaoService {
  private pararVerificacao?: () => void;
  private verificacaoEmAndamento = false;
  private cancelamentoPendenteDeGravacao = false;

  constructor(
    private readonly historico: HistoricoNotificacoes,
    private readonly emailSender: EmailSender,
    private readonly lembretes?: DependenciasLembretes
  ) {}

  private static nomeDaTurma(turma: Class): string {
    return `${turma.getYear()}.${turma.getSemester()} de ${turma.getTopic()}`;
  }

  static montarEmailNotasPendentes(
    turma: Class,
    destinatario: string,
    prazoAcademico: Date
  ): {
    destinatario: string;
    assunto: string;
    conteudo: string;
    turmaRegistrada: string;
    pendenciasRegistradas: { nomeAluno: string; meta: string }[];
  } | null {
    const pendencias = turma.identificarPendencias();
    if (pendencias.length === 0) return null;

    const metasPorAluno = new Map<string, { nomeAluno: string; metas: string[] }>();

    // O CPF separa alunos homônimos. Somente o nome e as metas entram na mensagem.
    for (const { alunoCpf, nomeAluno, meta } of pendencias) {
      const aluno = metasPorAluno.get(alunoCpf);
      if (aluno) {
        aluno.metas.push(meta);
      } else {
        metasPorAluno.set(alunoCpf, { nomeAluno, metas: [meta] });
      }
    }

    const nomeTurma = NotificacaoService.nomeDaTurma(turma);
    const fuso = 'America/Sao_Paulo';

    // Formata o instante do prazo no horário de Brasília, independentemente do fuso do servidor.
    const data = prazoAcademico.toLocaleDateString('pt-BR', {
      timeZone: fuso, day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const hora = prazoAcademico.toLocaleTimeString('pt-BR', {
      timeZone: fuso, hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
    const linhas = Array.from(metasPorAluno.values(), ({ nomeAluno, metas }) =>
      `- ${nomeAluno}: ${metas.join(', ')}`
    );

    return {
      destinatario,
      turmaRegistrada: nomeTurma,
      pendenciasRegistradas: pendencias.map(({ nomeAluno, meta }) => ({ nomeAluno, meta })),
      assunto: `Notas pendentes — ${nomeTurma}`,
      conteudo: [
        'Olá,',
        '',
        `Ainda há notas pendentes na turma ${nomeTurma}.`,
        '',
        ...linhas,
        '',
        `Prazo acadêmico para lançamento das notas: ${data} às ${hora} (horário de Brasília).`
      ].join('\n')
    };
  }

  iniciarVerificacaoDeLembretes(persistirResultados?: () => boolean): () => void {
    if (this.pararVerificacao) return this.pararVerificacao;
    const dependencias = this.lembretes;
    if (!dependencias) throw new Error('Processamento de lembretes não configurado');

    let gravacaoPendente = false;
    let proximaRodadaRegular = Date.now() + INTERVALO_VERIFICACAO_MS;
    let temporizadorReenvio: ReturnType<typeof setTimeout> | undefined;

    const limparTemporizadorReenvio = () => {
      if (temporizadorReenvio !== undefined) clearTimeout(temporizadorReenvio);
      temporizadorReenvio = undefined;
    };

    const agendarProximoReenvio = (inicioDaRodada: number) => {
      limparTemporizadorReenvio();
      if (this.pararVerificacao !== parar || gravacaoPendente) return;

      let horario = proximaRodadaRegular;
      for (const turma of dependencias.classes.getAllClasses()) {
        for (const lembrete of turma.obterConfiguracaoLembretes().listar()) {
          const estado = lembrete.getEstado();
          if (estado !== 'Não enviado' && estado !== 'Agendado') continue;
          const agendamento = lembrete.getProximoReenvioEm()?.getTime();
          // A rodada regular fará a seleção se chegar antes ou junto com o reenvio.
          if (agendamento !== undefined && agendamento > inicioDaRodada && agendamento < horario) {
            horario = agendamento;
          }
        }
      }

      if (horario < proximaRodadaRegular) {
        temporizadorReenvio = setTimeout(() => {
          if (Date.now() < proximaRodadaRegular) void executar(true);
        }, Math.max(0, horario - Date.now()));
      }
    };

    const gravar = () => {
      gravacaoPendente = true;
      if (!persistirResultados?.()) return;
      gravacaoPendente = false;
      this.cancelamentoPendenteDeGravacao = false;
    };
    const executar = async (somenteReenvios = false) => {
      // Se um envio ainda estiver em andamento, a próxima verificação espera outro ciclo.
      if (this.verificacaoEmAndamento) return;
      this.verificacaoEmAndamento = true;
      const inicioDaRodada = Date.now();

      try {
        // Recupera a gravação da rodada anterior antes de iniciar novos envios.
        if (persistirResultados && gravacaoPendente) {
          gravar();
          if (gravacaoPendente) return;
        }

        const quantidadeAnterior = persistirResultados ? this.historico.listar().length : 0;
        try {
          await this.processarLembretesAteAgora(somenteReenvios);
        } finally {
          // Um cancelamento muda o lembrete sem acrescentar tentativa ao histórico.
          if (persistirResultados && (
            this.cancelamentoPendenteDeGravacao || this.historico.listar().length > quantidadeAnterior
          )) {
            gravar();
          }
        }
      } catch (erro) {
        console.error('Erro ao verificar lembretes:', erro);
      } finally {
        this.verificacaoEmAndamento = false;
        agendarProximoReenvio(inicioDaRodada);
      }
    };

    const intervalo = setInterval(() => {
      proximaRodadaRegular = Date.now() + INTERVALO_VERIFICACAO_MS;
      void executar();
    }, INTERVALO_VERIFICACAO_MS);
    const parar = () => {
      if (this.pararVerificacao !== parar) return;
      clearInterval(intervalo);
      limparTemporizadorReenvio();
      this.pararVerificacao = undefined;
    };

    this.pararVerificacao = parar;
    void executar(); // Já verifica os lembretes atrasados ao iniciar.
    return parar;
  }

  async processarLembretesAteAgora(somenteReenvios = false): Promise<Notificacao[]> {
    const dependencias = this.lembretes;
    if (!dependencias) throw new Error('Processamento de lembretes não configurado');

    const limiteDaVerificacao = Date.now();
    const registros: Notificacao[] = [];

    for (const turma of dependencias.classes.getAllClasses()) {
      for (const lembrete of turma.obterConfiguracaoLembretes().listar()) {
        const proximoReenvio = lembrete.getProximoReenvioEm();
        if (somenteReenvios && proximoReenvio === null) continue;
        const agendamento = proximoReenvio ?? lembrete.getAgendamento();
        if (agendamento.getTime() > limiteDaVerificacao) continue;

        registros.push(...await this.processar(turma, lembrete, dependencias));
      }
    }

    return registros;
  }

  async processarAgendados(turmaId: string, data: string, horario: string): Promise<Notificacao[]> {
    const dependencias = this.lembretes;
    if (!dependencias) throw new Error('Processamento de lembretes não configurado');

    const turma = dependencias.classes.findClassById(turmaId);
    if (!turma) throw new Error('Turma não encontrada');

    // Data e horário localizam o agendamento original em UTC.
    const agendados = turma.obterConfiguracaoLembretes().buscarLembretesPara(data, horario);
    if (agendados.length === 0) throw new Error('Não existe lembrete para o agendamento informado');

    const registros: Notificacao[] = [];
    for (const lembrete of agendados) {
      // A solicitação pelo agendamento original não adianta um reenvio programado.
      if (lembrete.getProximoReenvioEm() !== null) continue;
      registros.push(...await this.processar(turma, lembrete, dependencias));
    }

    return registros;
  }

  private async processar(
    turma: Class,
    lembrete: Lembrete,
    dependencias: DependenciasLembretes
  ): Promise<Notificacao[]> {
    const estado = lembrete.getEstado();
    if (lembrete.jaFoiEnviado() || estado === 'Ignorado' || estado === 'Cancelado') return [];

    const proximoReenvio = lembrete.getProximoReenvioEm();
    const reenvio = proximoReenvio !== null;
    const instanteAtual = new Date();
    if ((proximoReenvio ?? lembrete.getAgendamento()).getTime() > instanteAtual.getTime()) return [];

    const turmaRegistrada = NotificacaoService.nomeDaTurma(turma);
    const lembreteId = lembrete.getId();
    const tentativas = this.historico.listar().filter(registro =>
      registro.turmaRegistrada === turmaRegistrada &&
      registro.lembreteId === lembreteId &&
      (registro.resultado === 'Falha' || registro.resultado === 'Enviado')
    );
    if (tentativas.some(registro => registro.resultado === 'Enviado')) return [];
    if (reenvio ? tentativas.length === 0 || tentativas.length > INTERVALOS_REENVIO_MS.length : tentativas.length > 0) {
      return [];
    }

    const prazoAcademico = turma.getPrazoAcademico();
    if (prazoAcademico === null || turma.prazoEncerrado(instanteAtual)) {
      if (reenvio) this.cancelarReenvio(turma, lembreteId, 'Prazo acadêmico encerrado');
      return [];
    }

    const destinatario = dependencias.classes.obterEmailDasTurmas();
    if (destinatario === null) throw new Error('Cadastre um e-mail para as turmas');

    const mensagem = NotificacaoService.montarEmailNotasPendentes(turma, destinatario, prazoAcademico);
    if (mensagem === null) {
      const motivo = 'Nenhuma nota pendente';
      if (reenvio) {
        this.cancelarReenvio(turma, lembreteId, motivo);
        return [];
      }
      turma.obterConfiguracaoLembretes().ignorar(lembreteId, motivo);

      // Ignorado registra o processamento sem contar como tentativa de envio.
      const registro = new Notificacao(
        this.historico.proximoId(),
        destinatario,
        { lembreteId, turmaRegistrada, prazoRegistrado: prazoAcademico, pendenciasRegistradas: [] },
        instanteAtual,
        'Ignorado',
        motivo
      );
      this.historico.registrar(registro);
      return [registro];
    }

    const resultado = await dependencias.emailSender.send(
      mensagem.destinatario, mensagem.assunto, mensagem.conteudo
    );

    // O histórico guarda o contexto da mensagem que foi entregue ao transporte.
    const tentativa = new Notificacao(
      this.historico.proximoId(),
      mensagem.destinatario,
      {
        lembreteId: lembrete.getId(),
        turmaRegistrada: mensagem.turmaRegistrada,
        prazoRegistrado: prazoAcademico,
        pendenciasRegistradas: mensagem.pendenciasRegistradas
      },
      instanteAtual,
      resultado.aceito ? 'Enviado' : 'Falha',
      'Notas pendentes',
      resultado.aceito ? undefined : resultado.descricaoFalha
    );

    this.historico.registrar(tentativa);
    const configuracao = turma.obterConfiguracaoLembretes();
    if (resultado.aceito) {
      configuracao.marcarComoEnviado(lembreteId);
      return [tentativa];
    }

    // O índice representa as tentativas anteriores à falha que acabamos de registrar.
    const espera = INTERVALOS_REENVIO_MS[tentativas.length];
    if (espera === undefined) {
      this.cancelarReenvio(turma, lembreteId, 'Limite de tentativas atingido');
      console.error('Limite de tentativas do lembrete atingido.', { turma: turmaRegistrada, lembreteId });
      return [tentativa];
    }

    configuracao.programarReenvio(lembreteId, new Date(Date.now() + espera));
    return [tentativa];
  }

  private cancelarReenvio(turma: Class, lembreteId: string, motivo: string): void {
    turma.obterConfiguracaoLembretes().cancelar(lembreteId, motivo);
    this.cancelamentoPendenteDeGravacao = true;
  }

  /** Notifica cada destinatário sobre uma mudança na composição de um grupo. */
  notificarGrupo(grupo: string, motivo: string, destinatarios: string[], conteudo: string): Notificacao[] {
    return destinatarios.map(destinatario => {
      const envio = this.emailSender.send(destinatario, `${motivo} - ${grupo}`, conteudo);
      const notificacao = new Notificacao(
        this.historico.proximoId(),
        destinatario,
        grupo,
        new Date(),
        envio.aceito ? 'Enviado' : 'Falha',
        motivo,
        envio.descricaoFalha
      );
      this.historico.registrar(notificacao);
      return notificacao;
    });
  }
}
