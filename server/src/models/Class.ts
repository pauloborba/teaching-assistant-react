import { Student } from './Student';
import { Enrollment } from './Enrollment';
import { EspecificacaoDoCalculoDaMedia } from './EspecificacaoDoCalculoDaMedia';

export class Class {
  private topic: string;
  private semester: number;
  private year: number;
  private readonly especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia;
  private enrollments: Enrollment[];
  private metas: string[];
  private metasLocked: boolean;

  constructor(topic: string, semester: number, year: number, metas: string[] = [], especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia, enrollments: Enrollment[] = []) {
    this.topic = topic;
    this.semester = semester;
    this.year = year;
    this.especificacaoDoCalculoDaMedia = especificacaoDoCalculoDaMedia;
    this.enrollments = enrollments;
    this.metas = metas;
    this.metasLocked = metas.length > 0;
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

  getMetas(): string[] {
    return [...this.metas]; // Return copy to prevent external modification
  }

  isMetasLocked(): boolean {
    return this.metasLocked;
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
  
  // Metas management
  setMetas(metas: string[]): void {
    if (this.metasLocked) {
      throw new Error('Metas já foram definidas para a turma e não podem ser alteradas!');
    }
    if (!Array.isArray(metas) || metas.length === 0) {
      throw new Error('As metas de uma turma não devem ser vazias!');
    }
    // Check for empty strings in metas
    if (metas.some(m => !m || m.trim() === '')) {
      throw new Error('Metas não podem ter títulos vazios!');
    }
    // verificar se array tem duplicatas
    const hasDuplicates = metas.length !== new Set(metas).size;
    if (hasDuplicates) {
      throw new Error('Metas não podem conter duplicatas!');
    }
    this.metas = metas;
    this.metasLocked = true;
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
      semester: this.semester,
      year: this.year,
      metas: this.metas,
      metasLocked: this.metasLocked,
      especificacaoDoCalculoDaMedia: this.especificacaoDoCalculoDaMedia.toJSON(),
      enrollments: this.enrollments.map(enrollment => enrollment.toJSON())
    };
  }

  // Create Class from JSON object
  static fromJSON(data: { topic: string; semester: number; year: number; metas: string[]; especificacaoDoCalculoDaMedia: any, enrollments: any[] }, allStudents: Student[]): Class {
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

    const metas = Array.isArray(data.metas) ? data.metas : [];
    const cls = new Class(data.topic, data.semester, data.year, metas, especificacaoDoCalculoDaMedia, enrollments);
    // Se o JSON já veio com metas e quisermos respeitar lock vindo do arquivo, checar data.metasLocked
    if ((data as any).metasLocked) {
      // forçar lock mesmo que metas tenha sido passada vazia (já tratada acima)
      (cls as any).metasLocked = true;
    }

    return cls;
  }
}
