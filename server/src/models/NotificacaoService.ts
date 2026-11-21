import { EmailSender, EmailSenderSmtp } from './EmailSender';
import { Class } from './Class';
import { Classes } from './Classes';
import { HistoricoNotificacoes } from './HistoricoNotificacoes';
import { Lembrete } from './Lembrete';
import { Notificacao } from './Notificacao';

type DependenciasLembretes = {
  classes: Classes;
  emailSender: Pick<EmailSenderSmtp, 'send'>; // Permite usar o SMTP real ou simular somente a operação de envio.
};

/**
 * Serviço compartilhado de notificações. Para cada destinatário, solicita o
 * envio a EmailSender e registra o resultado em HistoricoNotificacoes.
 */
export class NotificacaoService {
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
      const registro = await this.processar(turma, lembrete, dependencias);
      if (registro) registros.push(registro);
    }

    return registros;
  }

  private async processar(
    turma: Class,
    lembrete: Lembrete,
    dependencias: DependenciasLembretes
  ): Promise<Notificacao | null> {
    const estado = lembrete.getEstado();
    if (lembrete.jaFoiEnviado() || estado === 'Ignorado' || estado === 'Cancelado') return null;

    // A entrada de agendamentos trata o horário original. Reenvios terão sua própria entrada.
    if (lembrete.getProximoReenvioEm() !== null) return null;

    const instanteAtual = new Date();
    if (lembrete.getAgendamento().getTime() > instanteAtual.getTime()) return null;

    const prazoAcademico = turma.getPrazoAcademico();
    if (prazoAcademico === null || turma.prazoEncerrado(instanteAtual)) return null;

    const destinatario = dependencias.classes.obterEmailDasTurmas();
    if (destinatario === null) throw new Error('Cadastre um e-mail para as turmas');

    const mensagem = NotificacaoService.montarEmailNotasPendentes(turma, destinatario, prazoAcademico);
    if (mensagem === null) {
      const turmaRegistrada = NotificacaoService.nomeDaTurma(turma);
      const lembreteId = lembrete.getId();

      // Um lembrete com tentativa anterior será tratado pelo fluxo de reenvio.
      const temTentativaAnterior = this.historico.listar().some(registro =>
        registro.turmaRegistrada === turmaRegistrada &&
        registro.lembreteId === lembreteId &&
        (registro.resultado === 'Falha' || registro.resultado === 'Enviado')
      );
      if (temTentativaAnterior) return null;

      const motivo = 'Nenhuma nota pendente';
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
      return registro;
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
    if (resultado.aceito) {
      // Atualiza pelo ID porque buscarLembretesPara devolve uma cópia.
      turma.obterConfiguracaoLembretes().marcarComoEnviado(lembrete.getId());
    }

    return tentativa;
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
