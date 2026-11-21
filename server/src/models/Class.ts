import { Student } from './Student';
import { Enrollment } from './Enrollment';
import { EspecificacaoDoCalculoDaMedia } from './EspecificacaoDoCalculoDaMedia';
import { Roteiro } from './Roteiro';
import { RespostasDeRoteiro, Desempenho, MENSAGEM_SEM_RESULTADOS } from './RespostasDeRoteiro';
import { RespostasDeAvaliacao } from './RespostasDeAvaliacao';

export class Class {
  private topic: string;
  private semester: number;
  private year: number;
  private readonly especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia;
  private enrollments: Enrollment[];
  private respostasDeRoteiros: RespostasDeRoteiro[] = [];

  constructor(topic: string, semester: number, year: number, especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia, enrollments: Enrollment[] = []) {
    this.topic = topic;
    this.semester = semester;
    this.year = year;
    this.especificacaoDoCalculoDaMedia = especificacaoDoCalculoDaMedia;
    this.enrollments = enrollments;
  }

  // Getters
  getTopic(): string {
    return this.topic;
  }

  getSemester(): number {
    return this.semester;
  }

  getYear(): number {
    return this.year;
  }

  getEnrollments(): Enrollment[] {
    return [...this.enrollments]; // Return copy to prevent external modification
  }

  // Generate unique class ID
  getClassId(): string {
    return `${this.topic}-${this.year}-${this.semester}`;
  }

  // Setters for editing
  setTopic(topic: string): void {
    this.topic = topic;
  }

  setSemester(semester: number): void {
    this.semester = semester;
  }

  setYear(year: number): void {
    this.year = year;
  }

  getEspecificacaoDoCalculoDaMedia(): EspecificacaoDoCalculoDaMedia {
    return this.especificacaoDoCalculoDaMedia;
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

  // Nome da turma como aparece no relatório, ex.: "ESS - 2026.2"
  getNome(): string {
    return `${this.topic} - ${this.year}.${this.semester}`;
  }

  // Resultados da turma nos roteiros
  getRespostasDeRoteiros(): RespostasDeRoteiro[] {
    return [...this.respostasDeRoteiros];
  }

  findRespostasDoRoteiro(tituloRoteiro: string): RespostasDeRoteiro | undefined {
    return this.respostasDeRoteiros.find(r => r.getRoteiro().temTitulo(tituloRoteiro));
  }

  // PONTO DE ENCAIXE com "Corrigir roteiros": é por aqui que entra o resultado corrigido
  // de um aluno matriculado na turma (acertos, erros e tempo de entrega) em um roteiro.
  // Hoje quem chama é o cadastro direto (rota POST .../respostas); depois, a correção.
  addRespostasDeAvaliacao(roteiro: Roteiro, avaliacao: RespostasDeAvaliacao): void {
    if (!this.findEnrollmentByStudentCPF(avaliacao.getAluno().getCPF())) {
      throw new Error('Student is not enrolled in this class');
    }

    let respostas = this.findRespostasDoRoteiro(roteiro.getTitulo());
    if (!respostas) {
      respostas = new RespostasDeRoteiro(roteiro);
      this.respostasDeRoteiros.push(respostas);
    }
    respostas.addAvaliacao(avaliacao);
  }

  removeRespostasDoRoteiro(tituloRoteiro: string): void {
    this.respostasDeRoteiros = this.respostasDeRoteiros.filter(r => !r.getRoteiro().temTitulo(tituloRoteiro));
  }

  temResultadosNoRoteiro(tituloRoteiro: string): boolean {
    const respostas = this.findRespostasDoRoteiro(tituloRoteiro);
    return respostas !== undefined && respostas.temResultados();
  }

  getDesempenhoNoRoteiro(tituloRoteiro: string): Desempenho {
    const respostas = this.findRespostasDoRoteiro(tituloRoteiro);
    if (!respostas) {
      throw new Error(MENSAGEM_SEM_RESULTADOS);
    }
    return respostas.calcularDesempenho();
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.getClassId(),
      topic: this.topic,
      semester: this.semester,
      year: this.year,
      especificacaoDoCalculoDaMedia: this.especificacaoDoCalculoDaMedia.toJSON(),
      enrollments: this.enrollments.map(enrollment => enrollment.toJSON()),
      respostasDeRoteiros: this.respostasDeRoteiros.map(respostas => respostas.toJSON())
    };
  }

  // Create Class from JSON object
  static fromJSON(data: { topic: string; semester: number; year: number; especificacaoDoCalculoDaMedia: any, enrollments: any[] }, allStudents: Student[]): Class {
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

    return new Class(data.topic, data.semester, data.year, especificacaoDoCalculoDaMedia, enrollments);
  }
}
