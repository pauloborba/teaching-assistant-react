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

  // Update constructor to accept metasLocked (optional, default false)
  constructor(
    topic: string, 
    semester: number, 
    year: number, 
    metas: string[] = [], 
    especificacaoDoCalculoDaMedia: EspecificacaoDoCalculoDaMedia, 
    enrollments: Enrollment[] = [],
    metasLocked: boolean = false // Add this parameter
  ) {
    this.topic = topic;
    this.semester = semester;
    this.year = year;
    this.especificacaoDoCalculoDaMedia = especificacaoDoCalculoDaMedia;
    this.metas = metas;
    this.enrollments = enrollments;
    this.metasLocked = metasLocked; // Initialize properly
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
    this.metasLocked = true; // Lock it immediately after setting
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
  
  // Convert to JSON for API responses AND persistence
  toJSON() {
    return {
      id: this.getClassId(),
      topic: this.topic,
      semester: this.semester,
      year: this.year,
      metas: this.metas,
      metasLocked: this.metasLocked, // Persist the state
      // Check if toJSON exists (it might be a plain object if loaded incorrectly previously)
      especificacaoDoCalculoDaMedia: this.especificacaoDoCalculoDaMedia.toJSON ? this.especificacaoDoCalculoDaMedia.toJSON() : this.especificacaoDoCalculoDaMedia,
      enrollments: this.enrollments.map(enrollment => enrollment.toJSON())
    };
  }

  // Create Class from JSON object
  static fromJSON(data: { 
    topic: string; 
    semester: number; 
    year: number; 
    metas: string[]; 
    especificacaoDoCalculoDaMedia: any, 
    enrollments: any[],
    metasLocked?: boolean // Add type definition here
  }, allStudents: Student[]): Class {
    const enrollments = data.enrollments.map(e => {
      const studentCpf = e.student ? (e.student.cpf || e.student._cpf) : null;
      const student = allStudents.find(s => s.getCPF() === studentCpf);
      
      if (!student) {
        // If student is not found (data inconsistency), we throw an error
        throw new Error(`Student with CPF ${studentCpf} not found for enrollment in class ${data.topic}`);
      }
      
      return Enrollment.fromJSON(e, student);
    });
    
    const isLocked = data.metasLocked !== undefined 
      ? data.metasLocked 
      : (data.metas && data.metas.length > 0);

    return new Class(
      data.topic, 
      data.semester, 
      data.year, 
      data.metas, 
      data.especificacaoDoCalculoDaMedia, 
      enrollments,
      isLocked
    );
  }
}
