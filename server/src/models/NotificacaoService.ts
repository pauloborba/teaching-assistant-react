import { EmailSender } from './EmailSender';
import { Class } from './Class';
import { HistoricoNotificacoes } from './HistoricoNotificacoes';
import { Notificacao } from './Notificacao';

/**
 * Serviço compartilhado de notificações. Para cada destinatário, solicita o
 * envio a EmailSender e registra o resultado em HistoricoNotificacoes.
 */
export class NotificacaoService {
  constructor(
    private readonly historico: HistoricoNotificacoes,
    private readonly emailSender: EmailSender
  ) {}

  static montarEmailNotasPendentes(
    turma: Class,
    destinatario: string,
    prazoAcademico: Date
  ): { destinatario: string; assunto: string; conteudo: string } | null {
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

    const nomeTurma = `${turma.getYear()}.${turma.getSemester()} de ${turma.getTopic()}`;
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
