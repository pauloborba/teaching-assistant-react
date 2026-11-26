import { Class } from './Class';
import { DomainError } from './DomainError';
import { ResultadoEnvio } from './EmailSender';
import { Enrollment } from './Enrollment';
import { ResultadoFinal } from './ResultadoFinal';

/** Qualquer serviço de e-mail com o contrato send(destinatario, assunto, conteudo). */
export interface EnviadorDeEmail {
  send(destinatario: string, assunto: string, conteudo: string): ResultadoEnvio | Promise<ResultadoEnvio>;
}

export const MENSAGEM_RESULTADO_JA_ENVIADO = 'O e-mail com o resultado final deste aluno já foi enviado';
export const MOTIVO_SEM_EMAIL = 'não possui e-mail cadastrado';

export interface MensagemEmail {
  assunto: string;
  conteudo: string;
}

export interface AlunoDoRelatorio {
  cpf: string;
  aluno: string;
}

export interface FalhaDeEnvio extends AlunoDoRelatorio {
  /** Motivo em linguagem usual, para completar "<aluno> não recebeu o resultado porque <motivo>". */
  motivo: string;
}

export interface AlunoSemResultado extends AlunoDoRelatorio {
  metasPendentes: string[];
}

/** O que aconteceu em uma liberação de envio. */
export interface RelatorioEnvio {
  enviados: AlunoDoRelatorio[];
  falhas: FalhaDeEnvio[];
  semResultado: AlunoSemResultado[];
  jaEnviados: AlunoDoRelatorio[];
}

/** Resultado do e-mail de atualização disparado por uma mudança de resultado. */
export interface AtualizacaoDeResultado {
  aluno: string;
  resultadoAnterior: ResultadoFinal;
  resultadoNovo: ResultadoFinal;
  enviado: boolean;
  motivoFalha?: string;
}

export interface OpcoesDeLiberacao {
  /** CPFs dos alunos escolhidos; sem a lista, todos os alunos da turma. */
  cpfs?: string[];
  /** Conteúdo editado pelo professor na pré-visualização, por CPF. */
  conteudos?: Record<string, string>;
  /** Apenas os alunos cujo envio anterior falhou (nova tentativa). */
  somentePendentes?: boolean;
}

const limparCpf = (cpf: string): string => String(cpf).replace(/\D/g, '');

const periodoDaTurma = (turma: Class): string => `${turma.getYear()}.${turma.getSemester()}`;

/**
 * E-mail com o resultado final: disciplina, período, corretor e o resultado do próprio
 * aluno. Não inclui CPF, dados pessoais do professor nem dados de outros alunos.
 */
export function montarEmailResultado(turma: Class, matricula: Enrollment, resultado: ResultadoFinal): MensagemEmail {
  const disciplina = turma.getTopic();
  const periodo = periodoDaTurma(turma);
  return {
    assunto: `Resultado final - ${disciplina} (${periodo})`,
    conteudo: [
      `Olá, ${matricula.getStudent().name}.`,
      '',
      `Seu resultado final na disciplina ${disciplina}, no período ${periodo}, é: ${resultado}.`,
      '',
      `Corretor: ${turma.getProfessor()}`
    ].join('\n')
  };
}

/** E-mail enviado automaticamente quando o resultado muda depois de já ter sido enviado. */
export function montarEmailAtualizacao(
  turma: Class,
  matricula: Enrollment,
  anterior: ResultadoFinal,
  novo: ResultadoFinal
): MensagemEmail {
  const disciplina = turma.getTopic();
  const periodo = periodoDaTurma(turma);
  return {
    assunto: `Atualização do resultado final - ${disciplina} (${periodo})`,
    conteudo: [
      `Olá, ${matricula.getStudent().name}.`,
      '',
      `Seu resultado final na disciplina ${disciplina}, no período ${periodo}, foi atualizado.`,
      `Resultado anterior: ${anterior}.`,
      `Novo resultado: ${novo}.`,
      '',
      `Corretor: ${turma.getProfessor()}`
    ].join('\n')
  };
}

/** Traduz a descrição técnica da falha para linguagem usual. */
export function traduzirFalha(descricao?: string): string {
  const texto = descricao ?? '';
  if (/tempo limite|timeout|timed out/i.test(texto)) return 'o servidor de e-mail não respondeu a tempo';
  if (/GMAIL_|configur/i.test(texto)) return 'o envio de e-mails não está configurado no servidor';
  if (/autentica/i.test(texto)) return 'o servidor de e-mail recusou a conta usada para enviar';
  if (/destinat|endere/i.test(texto)) return 'o servidor de e-mail não aceitou o endereço do aluno';
  return 'o servidor de e-mail não conseguiu enviar a mensagem';
}

/**
 * Envio dos resultados finais por e-mail.
 * Só o professor acessa o sistema, então quem libera o envio não precisa ser identificado.
 * - O professor libera o envio, em massa ou para alunos escolhidos.
 * - Ao fim do período de correção (prazo acadêmico), os resultados ainda não enviados vão automaticamente.
 * - Cada resultado é enviado uma única vez; se mudar depois, vai um e-mail de atualização.
 * - Aluno com notas pendentes não recebe e não impede o envio aos demais.
 * - Uma falha deixa o aluno "Pendente" para nova tentativa, sem interromper os outros envios.
 */
export class ResultadosService {
  // Envios em andamento (turma + CPF): impede que solicitações simultâneas enviem o mesmo resultado duas vezes.
  private readonly emAndamento = new Set<string>();

  constructor(private obterEnviador: () => EnviadorDeEmail) {}

  /** Troca o serviço de e-mail (usado nos testes). */
  usarEnviador(enviador: EnviadorDeEmail): void {
    this.obterEnviador = () => enviador;
  }

  /** Pré-visualização do e-mail de um aluno com resultado definido. */
  previsualizar(turma: Class, cpf: string): MensagemEmail {
    const matricula = this.buscarMatricula(turma, cpf);
    const resultado = matricula.getResultadoFinal();
    if (!resultado) {
      throw new DomainError(`${matricula.getStudent().name} ainda tem notas pendentes`);
    }
    return montarEmailResultado(turma, matricula, resultado);
  }

  /** Liberação do envio pelo professor da turma. */
  async liberarEnvio(turma: Class, opcoes: OpcoesDeLiberacao = {}): Promise<RelatorioEnvio> {
    let matriculas = opcoes.cpfs
      ? opcoes.cpfs.map(cpf => this.buscarMatricula(turma, cpf))
      : turma.getEnrollments();
    if (opcoes.somentePendentes) {
      matriculas = matriculas.filter(m => m.getEnvioResultado().status === 'Pendente');
    }

    const conteudos: Record<string, string> = {};
    for (const [cpf, conteudo] of Object.entries(opcoes.conteudos ?? {})) {
      if (typeof conteudo === 'string' && conteudo.trim()) conteudos[limparCpf(cpf)] = conteudo;
    }
    return this.enviar(turma, matriculas, conteudos);
  }

  /**
   * Envio automático ao fim do período de correção: depois do prazo acadêmico, envia os
   * resultados definidos que ainda não foram enviados. Antes do prazo, não envia nada.
   * Alunos com envio "Pendente" aguardam uma nova tentativa do professor.
   */
  async verificarEnvioAutomatico(turma: Class, instanteAtual: Date): Promise<RelatorioEnvio | null> {
    if (turma.getPrazoAcademico() === null || !turma.prazoEncerrado(instanteAtual)) return null;

    const alvos = turma.getEnrollments().filter(m =>
      m.getEnvioResultado().status === 'Não enviado' && m.getResultadoFinal() !== null);
    if (alvos.length === 0) return null;
    return this.enviar(turma, alvos, {});
  }

  /**
   * Chamado depois de uma alteração de notas: se o resultado já tinha sido enviado e
   * mudou, envia automaticamente um e-mail de atualização. Sem mudança, não envia nada.
   */
  async notificarMudancaDeResultado(turma: Class, matricula: Enrollment): Promise<AtualizacaoDeResultado | null> {
    const envio = matricula.getEnvioResultado();
    const novo = matricula.getResultadoFinal();
    if (envio.status !== 'Enviado' || !envio.resultadoEnviado || !novo || novo === envio.resultadoEnviado) {
      return null;
    }

    const chave = this.chave(turma, matricula);
    if (this.emAndamento.has(chave)) return null;
    this.emAndamento.add(chave);
    try {
      const anterior = envio.resultadoEnviado;
      const aluno = matricula.getStudent();
      const base = { aluno: aluno.name, resultadoAnterior: anterior, resultadoNovo: novo };
      if (!aluno.email) {
        matricula.registrarFalhaEnvioResultado(MOTIVO_SEM_EMAIL);
        return { ...base, enviado: false, motivoFalha: MOTIVO_SEM_EMAIL };
      }

      const mensagem = montarEmailAtualizacao(turma, matricula, anterior, novo);
      const envioAceito = await this.solicitarEnvio(aluno.email, mensagem);
      if (envioAceito.aceito) {
        matricula.registrarEnvioResultado(novo);
        return { ...base, enviado: true };
      }
      const motivo = traduzirFalha(envioAceito.descricaoFalha);
      matricula.registrarFalhaEnvioResultado(motivo);
      return { ...base, enviado: false, motivoFalha: motivo };
    } finally {
      this.emAndamento.delete(chave);
    }
  }

  private async enviar(turma: Class, matriculas: Enrollment[], conteudos: Record<string, string>): Promise<RelatorioEnvio> {
    const relatorio: RelatorioEnvio = { enviados: [], falhas: [], semResultado: [], jaEnviados: [] };
    const alvos: { matricula: Enrollment; resultado: ResultadoFinal; chave: string }[] = [];

    // Separa e reserva os alunos antes do primeiro envio, para que uma solicitação simultânea não os repita.
    for (const matricula of matriculas) {
      const aluno = this.identificar(matricula);
      const resultado = matricula.getResultadoFinal();
      if (!resultado) {
        relatorio.semResultado.push({ ...aluno, metasPendentes: matricula.getMetasPendentes() });
        continue;
      }
      const chave = this.chave(turma, matricula);
      if (matricula.getEnvioResultado().status === 'Enviado' || this.emAndamento.has(chave)) {
        relatorio.jaEnviados.push(aluno);
        continue;
      }
      this.emAndamento.add(chave);
      alvos.push({ matricula, resultado, chave });
    }

    try {
      for (const { matricula, resultado } of alvos) {
        const aluno = this.identificar(matricula);
        const email = matricula.getStudent().email;
        if (!email) {
          matricula.registrarFalhaEnvioResultado(MOTIVO_SEM_EMAIL);
          relatorio.falhas.push({ ...aluno, motivo: MOTIVO_SEM_EMAIL });
          continue;
        }

        const mensagem = montarEmailResultado(turma, matricula, resultado);
        const conteudo = conteudos[aluno.cpf] ?? mensagem.conteudo;
        const envio = await this.solicitarEnvio(email, { assunto: mensagem.assunto, conteudo });
        if (envio.aceito) {
          matricula.registrarEnvioResultado(resultado);
          relatorio.enviados.push(aluno);
        } else {
          const motivo = traduzirFalha(envio.descricaoFalha);
          matricula.registrarFalhaEnvioResultado(motivo);
          relatorio.falhas.push({ ...aluno, motivo });
        }
      }
    } finally {
      alvos.forEach(({ chave }) => this.emAndamento.delete(chave));
    }
    return relatorio;
  }

  private async solicitarEnvio(destinatario: string, mensagem: MensagemEmail): Promise<ResultadoEnvio> {
    try {
      return await this.obterEnviador().send(destinatario, mensagem.assunto, mensagem.conteudo);
    } catch (erro) {
      return { aceito: false, descricaoFalha: (erro as Error)?.message };
    }
  }

  private buscarMatricula(turma: Class, cpf: string): Enrollment {
    const matricula = turma.findEnrollmentByStudentCPF(limparCpf(cpf));
    if (!matricula) throw new DomainError('Aluno não matriculado na turma');
    return matricula;
  }

  private identificar(matricula: Enrollment): AlunoDoRelatorio {
    const aluno = matricula.getStudent();
    return { cpf: aluno.getCPF(), aluno: aluno.name };
  }

  private chave(turma: Class, matricula: Enrollment): string {
    return `${turma.getClassId()}|${matricula.getStudent().getCPF()}`;
  }
}
