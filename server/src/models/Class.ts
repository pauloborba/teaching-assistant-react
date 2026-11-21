import { Student } from './Student';
import { Enrollment } from './Enrollment';
import { EspecificacaoDoCalculoDaMedia } from './EspecificacaoDoCalculoDaMedia';
import { ConfiguracaoLembretes } from './ConfiguracaoLembretes';
import { PeriodoAcademico } from './PeriodoAcademico';
import { EVALUATION_GOALS } from './Evaluation';

export class Class {
  private topic: string;
  private periodoAcademico: PeriodoAcademico; // Referencia o período compartilhado pelas turmas do mesmo ano e semestre.
  private readonly especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia;
  private enrollments: Enrollment[];
  private readonly configuracaoLembretes = new ConfiguracaoLembretes(); // Cria uma configuração exclusiva da turma; readonly impede substituir essa referência.

  constructor(topic: string, periodoAcademico: PeriodoAcademico, especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia, enrollments: Enrollment[] = []) {
    this.topic = topic;
    this.periodoAcademico = periodoAcademico; // Mantém a referência recebida; não cria outro período nem copia seu prazo.
    this.especificacaoDoCalculoDaMedia = especificacaoDoCalculoDaMedia;
    this.enrollments = enrollments;
  }

  // Getters
  getTopic(): string {
    return this.topic;
  }

  getSemester(): number {
    return this.periodoAcademico.getSemestre(); // O semestre vem do período associado.
  }

  getYear(): number {
    return this.periodoAcademico.getAno(); // O ano vem do período associado.
  }

  obterPeriodoAcademico(): PeriodoAcademico {
    return this.periodoAcademico; // Disponibiliza a associação prevista no DDD.
  }

  obterConfiguracaoLembretes(): ConfiguracaoLembretes {
    return this.configuracaoLembretes; // Permite acessar os lembretes da turma pelas operações da configuração.
  }

  getPrazoAcademico(): Date | null {
    return this.periodoAcademico.getPrazoAcademico(); // Consulta o prazo oficial; o período já devolve uma cópia da data.
  }

  getEnrollments(): Enrollment[] {
    return [...this.enrollments]; // Return copy to prevent external modification
  }

  // Generate unique class ID
  getClassId(): string {
    return `${this.topic}-${this.getYear()}-${this.getSemester()}`;
  }

  // Setters for editing
  setTopic(topic: string): void {
    this.topic = topic;
  }

  definirPeriodoAcademico(periodo: PeriodoAcademico): void {
    if (periodo === this.periodoAcademico) return; // Editar outros dados da turma não troca sua associação atual.
    const prazo = periodo.getPrazoAcademico();
    if (prazo === null) {
      const possuiPendentes = this.configuracaoLembretes.listar()
        .some(lembrete => lembrete.getEstado() === 'Não enviado' || lembrete.getEstado() === 'Agendado');
      if (possuiPendentes) throw new Error('Prazo acadêmico não definido para o período');
    } else if (this.configuracaoLembretes.possuiAgendamentosPendentesApos(prazo)) {
      throw new Error('Prazo acadêmico incompatível com lembretes pendentes');
    }

    this.periodoAcademico = periodo; // Troca ano e semestre juntos, preservando matrículas e a configuração de lembretes.
  }

  getEspecificacaoDoCalculoDaMedia(): EspecificacaoDoCalculoDaMedia {
    return this.especificacaoDoCalculoDaMedia;
  }

  prazoEncerrado(instanteAtual: Date): boolean {
    return this.periodoAcademico.prazoEncerrado(instanteAtual); // Reutiliza a regra do período, sem duplicar a comparação.
  }

  identificarPendencias(): { nomeAluno: string; meta: string }[] {
    return this.enrollments.flatMap(matricula => {
      const nomeAluno = matricula.getStudent().name;

      // Percorre as metas esperadas, inclusive as que ainda não têm registro em nenhuma matrícula.
      return EVALUATION_GOALS
        .filter(meta => matricula.getEvaluationForGoal(meta) === undefined)
        .map(meta => ({ nomeAluno, meta }));
    });
  }

  // Enrollment management
  addEnrollment(student: Student): Enrollment {
    // Check if student is already enrolled
    const existingEnrollment = this.findEnrollmentByStudentCPF(student.getCPF());
    if (existingEnrollment) {
      throw new Error('Student is already enrolled in this class');
    }

    const enrollment = new Enrollment(student);
    this.enrollments.push(enrollment);
    return enrollment;
  }

  removeEnrollment(studentCPF: string): boolean {
    const index = this.enrollments.findIndex(enrollment => 
      enrollment.getStudent().getCPF() === studentCPF
    );
    
    if (index === -1) {
      return false;
    }

    this.enrollments.splice(index, 1);
    return true;
  }

  findEnrollmentByStudentCPF(studentCPF: string): Enrollment | undefined {
    return this.enrollments.find(enrollment => 
      enrollment.getStudent().getCPF() === studentCPF
    );
  }

  // Get all enrolled students
  getEnrolledStudents(): Student[] {
    return this.enrollments.map(enrollment => enrollment.getStudent());
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.getClassId(),
      topic: this.topic,
      semester: this.getSemester(),
      year: this.getYear(),
      prazoAcademico: this.getPrazoAcademico()?.toISOString() ?? null, // Informação calculada para leitura; não é um prazo editável da turma.
      especificacaoDoCalculoDaMedia: this.especificacaoDoCalculoDaMedia.toJSON(),
      enrollments: this.enrollments.map(enrollment => enrollment.toJSON())
    };
  }

  // Create Class from JSON object
  static fromJSON(data: {
    topic: string;
    semester: number;
    year: number;
    especificacaoDoCalculoDaMedia: any;
    enrollments: any[];
    prazoAcademico?: string | null; // Pode existir em uma resposta antiga; o período informado é a fonte do prazo.
  }, allStudents: Student[], periodoAcademico: PeriodoAcademico): Class {
    if (data.year !== periodoAcademico.getAno() || data.semester !== periodoAcademico.getSemestre()) {
      throw new Error('Período acadêmico incompatível com a turma'); // Impede reconstruir uma turma vinculada ao ano ou semestre errado.
    }
    const enrollments = data.enrollments
      ? data.enrollments.map((enrollmentData: any) => {
          const student = allStudents.find(s => s.getCPF() === enrollmentData.student.cpf);
          if (!student) {
            throw new Error(`Student with CPF ${enrollmentData.student.cpf} not found`);
          }
          return Enrollment.fromJSON(enrollmentData, student);
        })
      : [];
    
    // Novo carregamento do EspecificacaoDoCalculoDaMedia
    const especificacaoDoCalculoDaMedia = EspecificacaoDoCalculoDaMedia.fromJSON(data.especificacaoDoCalculoDaMedia);

    return new Class(data.topic, periodoAcademico, especificacaoDoCalculoDaMedia, enrollments); // Reutiliza o período resolvido pelo chamador e preserva as matrículas.
  }
}
