import { Student } from './Student';
import { Evaluation, Grade } from './Evaluation';
import { DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA, EspecificacaoDoCalculoDaMedia } from './EspecificacaoDoCalculoDaMedia';
import { calcularMediaPosFinal, calcularResultadoFinal, ResultadoFinal } from './ResultadoFinal';
import { DomainError } from './DomainError';

/** Situação do e-mail de resultado final do aluno. */
export type StatusEnvioResultado = 'Não enviado' | 'Enviado' | 'Pendente';

/**
 * Estado do envio do resultado final. Guarda apenas o último resultado aceito pelo
 * serviço de e-mail (para não reenviar o mesmo resultado e detectar mudanças) e o
 * motivo da última falha; a plataforma não mantém histórico dos e-mails enviados.
 */
export interface EnvioResultado {
  status: StatusEnvioResultado;
  resultadoEnviado: ResultadoFinal | null;
  motivoFalha: string | null;
}

const STATUS_VALIDOS: StatusEnvioResultado[] = ['Não enviado', 'Enviado', 'Pendente'];

export class Enrollment {
  private student: Student;
  private evaluations: Evaluation[];
  // Média do estudante antes da prova final
  private mediaPreFinal: number | null;
  // Média do estudante depois da final
  private mediaPosFinal: number | null;
  private reprovadoPorFalta: Boolean;
  // Nota da prova final, quando o aluno a realizou
  private notaProvaFinal: number | null = null;
  private envioResultado: EnvioResultado = { status: 'Não enviado', resultadoEnviado: null, motivoFalha: null };

  constructor(student: Student, evaluations: Evaluation[] = [], mediaPreFinal: number | null = null, mediaPosFinal: number | null = null, reprovadoPorFalta: Boolean = false) {
    this.student = student;
    this.evaluations = evaluations;
    // Com notas lançadas, a média vem delas; sem notas, mantém o valor recebido.
    this.mediaPreFinal = evaluations.length > 0 ? this.calculateMediaPreFinal() : mediaPreFinal;
    this.mediaPosFinal = mediaPosFinal;
    this.reprovadoPorFalta = reprovadoPorFalta;
  }

  // Get student
  getStudent(): Student {
    return this.student;
  }

  // Get evaluations
  getEvaluations(): Evaluation[] {
    return [...this.evaluations]; // Return copy to prevent external modification
  }

  // Calcula a média do estudante antes da prova final (MA = 10, MPA = 7, MANA = 4, metas com o mesmo peso).
  // Cálculo simplificado: usa sempre a especificação padrão e retorna null enquanto alguma meta estiver sem conceito.
  calculateMediaPreFinal(especificacao: EspecificacaoDoCalculoDaMedia = DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA): number | null {
    const notasDasMetas = new Map<string, Grade>();
    for (const meta of especificacao.getMetas()) {
      const avaliacao = this.getEvaluationForGoal(meta);
      if (!avaliacao) return null;
      notasDasMetas.set(meta, avaliacao.getGrade());
    }
    return especificacao.calc(notasDasMetas);
  }

  // Calcula a média do estudante depois da prova final: (média + nota da prova final) / 2
  calculateMediaPosFinal(): number | null {
    return calcularMediaPosFinal(this.mediaPreFinal, this.notaProvaFinal);
  }

  // Metas que ainda não têm conceito cadastrado
  getMetasPendentes(especificacao: EspecificacaoDoCalculoDaMedia = DEFAULT_ESPECIFICACAO_DO_CALCULO_DA_MEDIA): string[] {
    return especificacao.getMetas().filter(meta => !this.getEvaluationForGoal(meta));
  }

  // Get media do estudante antes da prova final
  getMediaPreFinal(): number | null {
    return this.mediaPreFinal;
  }

  // Set media do estudante antes da prova final
  setMediaPreFinal(mediaPreFinal: number | null){
    this.mediaPreFinal = mediaPreFinal;
  }

  // Get média do estudante depois da final (calculada quando há nota da prova final)
  getMediaPosFinal(): number | null {
    return this.notaProvaFinal !== null ? this.calculateMediaPosFinal() : this.mediaPosFinal;
  }

  // Set média do estudante depois da final
  setMediaPosFinal(mediaPosFinal: number | null){
    this.mediaPosFinal = mediaPosFinal;
  }

  getNotaProvaFinal(): number | null {
    return this.notaProvaFinal;
  }

  /** Cadastra a nota da prova final; só vale para aluno em prova final. */
  registrarNotaProvaFinal(nota: number | null): void {
    if (nota !== null && (!Number.isFinite(nota) || nota < 0 || nota > 10)) {
      throw new DomainError('A nota da prova final deve estar entre 0 e 10');
    }
    if (nota !== null) {
      const resultadoSemFinal = calcularResultadoFinal(this.mediaPreFinal, null, Boolean(this.reprovadoPorFalta));
      if (resultadoSemFinal !== 'Final') {
        throw new DomainError('O aluno não está em prova final');
      }
    }
    this.notaProvaFinal = nota;
  }

  /** Recupera a nota salva sem reaplicar as validações de cadastro. */
  restaurarNotaProvaFinal(nota: number | null): void {
    this.notaProvaFinal = typeof nota === 'number' && Number.isFinite(nota) ? nota : null;
  }

  // Get reprovado por falta
  getReprovadoPorFalta(): Boolean {
    return this.reprovadoPorFalta;
  }

  // Set reprovado por falta
  setReprovadoPorFalta(reprovadoPorFalta: Boolean){
    this.reprovadoPorFalta = reprovadoPorFalta;
  }

  /** Resultado final atual; null enquanto houver notas pendentes. */
  getResultadoFinal(): ResultadoFinal | null {
    return calcularResultadoFinal(this.mediaPreFinal, this.notaProvaFinal, Boolean(this.reprovadoPorFalta));
  }

  getEnvioResultado(): EnvioResultado {
    return { ...this.envioResultado };
  }

  /** O serviço de e-mail aceitou o e-mail com este resultado. */
  registrarEnvioResultado(resultado: ResultadoFinal): void {
    this.envioResultado = { status: 'Enviado', resultadoEnviado: resultado, motivoFalha: null };
  }

  /** O envio falhou; o aluno fica pendente para uma nova tentativa. */
  registrarFalhaEnvioResultado(motivo: string): void {
    this.envioResultado = { ...this.envioResultado, status: 'Pendente', motivoFalha: motivo };
  }

  /** Recupera o estado salvo, ignorando valores desconhecidos. */
  restaurarEnvioResultado(dados: any): void {
    if (!dados || !STATUS_VALIDOS.includes(dados.status)) return;
    this.envioResultado = {
      status: dados.status,
      resultadoEnviado: dados.resultadoEnviado ?? null,
      motivoFalha: dados.motivoFalha ?? null
    };
  }

  // Add or update an evaluation
  addOrUpdateEvaluation(goal: string, grade: 'MANA' | 'MPA' | 'MA'): void {
    const existingIndex = this.evaluations.findIndex(evaluation => evaluation.getGoal() === goal);
    if (existingIndex >= 0) {
      this.evaluations[existingIndex].setGrade(grade);
    } else {
      this.evaluations.push(new Evaluation(goal, grade));
    }
    this.mediaPreFinal = this.calculateMediaPreFinal();
  }

  // Remove an evaluation
  removeEvaluation(goal: string): boolean {
    const existingIndex = this.evaluations.findIndex(evaluation => evaluation.getGoal() === goal);
    if (existingIndex >= 0) {
      this.evaluations.splice(existingIndex, 1);
      this.mediaPreFinal = this.calculateMediaPreFinal();
      return true;
    }
    return false;
  }

  // Get evaluation for a specific goal
  getEvaluationForGoal(goal: string): Evaluation | undefined {
    return this.evaluations.find(evaluation => evaluation.getGoal() === goal);
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      student: this.student.toJSON(),
      evaluations: this.evaluations.map(evaluation => evaluation.toJSON()),
      mediaPreFinal: this.mediaPreFinal,
      mediaPosFinal: this.getMediaPosFinal(),
      notaProvaFinal: this.notaProvaFinal,
      reprovadoPorFalta: this.reprovadoPorFalta,
      resultadoFinal: this.getResultadoFinal(),
      envioResultado: this.getEnvioResultado()
    };
  }

  // Create Enrollment from JSON object
  static fromJSON(data: {
    student: any;
    evaluations: any[];
    mediaPreFinal?: number;
    mediaPosFinal?: number;
    notaProvaFinal?: number | null;
    reprovadoPorFalta?: boolean;
    envioResultado?: any;
  }, student: Student): Enrollment {
    const evaluations = data.evaluations
      ? data.evaluations.map((evalData: any) => Evaluation.fromJSON(evalData))
      : [];

    const mediaPreFinal = data.mediaPreFinal ?? 0;
    const mediaPosFinal = data.mediaPosFinal ?? 0;
    const reprovadoPorFalta = data.reprovadoPorFalta ?? false;

    const enrollment = new Enrollment(student, evaluations, mediaPreFinal, mediaPosFinal, reprovadoPorFalta);
    enrollment.restaurarNotaProvaFinal(data.notaProvaFinal ?? null);
    enrollment.restaurarEnvioResultado(data.envioResultado);
    return enrollment;
  }
}
