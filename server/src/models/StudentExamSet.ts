import { StudentExam } from './StudentExam';

export class StudentExamSet {
  private studentExams: StudentExam[] = [];

  constructor() {
    // StudentExamSet is independent of persistence
  }

  public addStudentExam(studentExam: StudentExam): StudentExam {
    if (this.findStudentExamById(studentExam.getId())) {
      throw new Error('Student exam with this ID already exists');
    }
    this.studentExams.push(studentExam);
    return studentExam;
  }

  public removeStudentExam(id: number): boolean {
    const index = this.studentExams.findIndex(se => se.getId() === id);
    if (index === -1) {
      return false;
    }
    this.studentExams.splice(index, 1);
    return true;
  }

  public findStudentExamById(id: number): StudentExam | undefined {
    return this.studentExams.find(se => se.getId() === id);
  }

  public findStudentExamsByExamId(examId: number): StudentExam[] {
    return this.studentExams.filter(se => se.getExamId() === examId);
  }

  public findStudentExamsByStudentCPF(studentCPF: string): StudentExam[] {
    return this.studentExams.filter(se => se.getStudentCPF() === studentCPF);
  }

  public findStudentExamsByClassId(classId: string, exams: { id: number; classId: string }[]): StudentExam[] {
    const examIds = exams
      .filter(e => e.classId === classId)
      .map(e => e.id);
    
    return this.studentExams.filter(se => examIds.includes(se.getExamId()));
  }

  public getAllStudentExams(): StudentExam[] {
    return [...this.studentExams];
  }

  public getCount(): number {
    return this.studentExams.length;
  }
}

