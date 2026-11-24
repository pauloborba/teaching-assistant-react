import { DomainError } from './DomainError';
import { EmailSender, EmailSenderSimulado, EmailSenderSmtp } from './EmailSender';
import { GradeNotification } from './GradeNotification';
import { Grupo } from './Grupo';
import { Grupos } from './Grupos';
import { HistoricoNotificacoes } from './HistoricoNotificacoes';
import { Monitores } from './Monitores';
import { Notificacao } from './Notificacao';
import { NotificacaoService } from './NotificacaoService';

export const MOTIVO_ALOCACAO = 'Alocação de monitor';
export const MOTIVO_AVISO = 'Aviso de alteração do grupo';
export const MOTIVO_SAIDA = 'Saída de monitor do grupo';
export const MOTIVO_ENTRADA = 'Entrada de monitor no grupo';
export const MOTIVO_REMOCAO = 'Remoção de monitor do grupo';
export const MOTIVO_ACUMULO = 'Acúmulo de grupos do monitor';

/** Situação de um monitor na lista de monitores da disciplina. */
export interface SituacaoMonitor {
  login: string;
  situacao: 'alocado' | 'livre';
  grupos: string[];
  alocacaoAutomatica: boolean;
}

/**
 * Serviços do servidor para grupos e monitores: coordena as coleções e solicita
 * ao NotificacaoService as notificações das mudanças bem-sucedidas.
 * Uma operação rejeitada não altera o grupo nem envia notificação.
 */
export class Services {
  readonly notificacaoService: NotificacaoService;
  readonly gradeNotificationService: GradeNotification;
  readonly gradeNotificationSender: EmailSender | Pick<EmailSenderSmtp, 'send'>;

  constructor(
    readonly grupos: Grupos = new Grupos(),
    readonly monitores: Monitores = new Monitores(),
    readonly historico: HistoricoNotificacoes = new HistoricoNotificacoes(),
    emailSender: EmailSender = new EmailSenderSimulado(),
    gradeNotificationSender: EmailSender | Pick<EmailSenderSmtp, 'send'> =
      process.env.NODE_ENV === 'test' ? emailSender : new EmailSenderSmtp()
  ) {
    this.notificacaoService = new NotificacaoService(historico, emailSender);
    this.gradeNotificationSender = gradeNotificationSender;
    this.gradeNotificationService = new GradeNotification(gradeNotificationSender);
  }

  criarGrupo(nome: string, alunos: string[] = []): Grupo {
    return this.grupos.adicionar(new Grupo(nome, alunos));
  }

  cadastrarMonitor(login: string): void {
    this.monitores.cadastrar(login);
  }

  /** Monitores que ainda não estão alocados a nenhum grupo. */
  monitoresDisponiveis(): string[] {
    const alocados = this.grupos.monitoresAlocados();
    return this.monitores.listar().filter(m => !alocados.has(m));
  }

  /** Lista de monitores da disciplina, com os grupos pelos quais cada um responde. */
  situacaoDosMonitores(): SituacaoMonitor[] {
    return this.monitores.listar().map(login => {
      const grupos = this.grupos.gruposDoMonitor(login);
      return {
        login,
        situacao: grupos.length ? 'alocado' : 'livre',
        grupos: grupos.map(g => g.nome),
        alocacaoAutomatica: grupos.some(g => g.alocacaoAutomatica)
      };
    });
  }

  /**
   * Aloca o monitor informado ao grupo, ou o primeiro monitor livre quando nenhum é
   * informado. Um monitor já alocado a outro grupo pode acumular o novo grupo; nesse
   * caso ele recebe uma notificação própria informando o acúmulo.
   */
  alocarMonitor(nomeGrupo: string, monitor?: string): Grupo {
    return this.alocar(nomeGrupo, monitor, false);
  }

  /** Alocação automática: escolhe um monitor livre para o grupo. */
  alocarAutomaticamente(nomeGrupo: string): Grupo {
    return this.alocar(nomeGrupo, undefined, true);
  }

  private alocar(nomeGrupo: string, monitor: string | undefined, automatica: boolean): Grupo {
    const grupo = this.obterGrupo(nomeGrupo);
    const escolhido = monitor || this.monitoresDisponiveis()[0];
    if (!escolhido) {
      throw new DomainError('Não há monitor disponível');
    }
    if (!this.monitores.existe(escolhido)) {
      throw new DomainError('Monitor não existe');
    }
    const outrosGrupos = this.grupos.gruposDoMonitor(escolhido).filter(g => g.nome !== nomeGrupo);
    grupo.alocarMonitor(escolhido, automatica);
    const conteudo = `O monitor ${escolhido} foi alocado ao grupo ${nomeGrupo}`;
    if (outrosGrupos.length === 0) {
      this.notificacaoService.notificarGrupo(nomeGrupo, MOTIVO_ALOCACAO, grupo.participantes(), conteudo);
    } else {
      const todos = [...outrosGrupos.map(g => g.nome), nomeGrupo].join(', ');
      this.notificacaoService.notificarGrupo(nomeGrupo, MOTIVO_ALOCACAO, [...grupo.alunos], conteudo);
      this.notificacaoService.notificarGrupo(nomeGrupo, MOTIVO_ACUMULO, [escolhido],
        `Você agora é responsável pelos grupos ${todos}`);
    }
    return grupo;
  }

  /** Remove o monitor do grupo sem realocá-lo; avisa os alunos do grupo. */
  removerMonitor(nomeGrupo: string): Grupo {
    const grupo = this.obterGrupo(nomeGrupo);
    const monitor = grupo.monitor;
    grupo.removerMonitor();
    this.notificacaoService.notificarGrupo(nomeGrupo, MOTIVO_REMOCAO, [...grupo.alunos],
      `O monitor ${monitor} foi removido do grupo ${nomeGrupo}`);
    return grupo;
  }

  /** Move o monitor de um grupo para outro; avisa os alunos dos dois grupos. */
  realocarMonitor(nomeOrigem: string, monitor: string, nomeDestino: string): Grupo {
    const origem = this.obterGrupo(nomeOrigem);
    const destino = this.grupos.buscar(nomeDestino);
    if (!destino) {
      throw new DomainError('Grupo de destino não existe');
    }
    if (origem.monitor !== monitor) {
      throw new DomainError('O monitor não está alocado ao grupo de origem');
    }
    if (destino.monitor) {
      throw new DomainError('O grupo de destino já possui monitor');
    }
    origem.removerMonitor();
    destino.alocarMonitor(monitor);
    this.notificacaoService.notificarGrupo(nomeOrigem, MOTIVO_SAIDA, [...origem.alunos],
      `O monitor ${monitor} deixou o grupo ${nomeOrigem}`);
    this.notificacaoService.notificarGrupo(nomeDestino, MOTIVO_ENTRADA, [...destino.alunos],
      `O monitor ${monitor} passou a acompanhar o grupo ${nomeDestino}`);
    return destino;
  }

  adicionarAluno(nomeGrupo: string, aluno: string): Grupo {
    const grupo = this.obterGrupo(nomeGrupo);
    grupo.adicionarAluno(aluno);
    this.notificacaoService.notificarGrupo(nomeGrupo, MOTIVO_AVISO, grupo.participantes(),
      `${aluno} foi adicionado ao grupo ${nomeGrupo}`);
    return grupo;
  }

  consultarHistorico(grupo?: string): Notificacao[] {
    return grupo ? this.historico.listarDoGrupo(grupo) : this.historico.listar();
  }

  private obterGrupo(nome: string): Grupo {
    const grupo = this.grupos.buscar(nome);
    if (!grupo) {
      throw new DomainError('Grupo não existe');
    }
    return grupo;
  }
}
