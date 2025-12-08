import { Class } from './Class';
import { Student } from './Student';

export interface ExamRecord {
  id: number;
  classId: string;
  title: string;
  isValid: boolean;
  openQuestions: number;
  closedQuestions: number;
  questions: number[];
}

export interface StudentExamRecord {
  id: number;
  studentCPF: string;
  examId: number;
  answers: Array<{
    questionId: number;
    answer: string;
  }>;
}

export interface StudentWithExam {
  studentCPF: string;
  studentName: string;
  examId: number;
  classId: string;
  examTitle: string;
  studentExamId?: number;
  answers?: Array<{
    questionId: number;
    answer: string;
  }>;
}

export class Exams {
  private exams: ExamRecord[] = [];
  private studentExams: StudentExamRecord[] = [];
  private nextId = 1;

  constructor(exams: ExamRecord[] = [], studentExams: StudentExamRecord[] = []) {
    this.exams = exams;
    this.studentExams = studentExams;
    this.nextId = this.calculateNextId();
  }

  /**
   * Calculate the next available exam ID
   * @returns The next ID to use
   */
  private calculateNextId(): number {
    if (this.exams.length === 0) {
      return 1;
    }
    const maxId = this.exams.reduce((max, exam) => Math.max(max, exam.id), 0);
    return maxId + 1;
  }

  /**
   * Get the next exam ID and increment the counter
   * @returns The next available exam ID
   */
  public getNextExamId(): number {
    return this.nextId++;
  }

  /**
   * Refresh the nextId counter based on current exams
   * Should be called after loading exams from file
   */
  public refreshNextId(): void {
    this.nextId = this.calculateNextId();
  }

  /**
   * Get list of students with exam information for a specific class and exam
   * @param classId - The class ID to filter by
   * @param examId - The exam ID to filter by (optional)
   * @param enrolledStudents - List of students enrolled in the class
   * @returns Array of students with their exam information
   */
  getStudentsWithExams(
    classId: string,
    enrolledStudents: Student[],
    examId?: number
  ): StudentWithExam[] {
    // Filter exams by classId and optionally by examId
    const classExams = this.exams.filter(
      exam => exam.classId === classId && (!examId || exam.id === examId)
    );

    if (classExams.length === 0) {
      return [];
    }

    const studentsWithExams: StudentWithExam[] = [];

    // For each exam in the class
    classExams.forEach(exam => {
      // For each enrolled student
      enrolledStudents.forEach(student => {
        // Find if student has this exam
        const studentExam = this.studentExams.find(
          se => se.examId === exam.id && se.studentCPF === student.getCPF()
        );

        studentsWithExams.push({
          studentCPF: student.getCPF(),
          studentName: student.name,
          examId: exam.id,
          classId: exam.classId,
          examTitle: exam.title,
          studentExamId: studentExam?.id,
          answers: studentExam?.answers || []
        });
      });
    });

    return studentsWithExams;
  }

  /**
   * Get all exams for a specific class
   * @param classId - The class ID to filter by
   * @returns Array of exams in the class
   */
  getExamsByClassId(classId: string): ExamRecord[] {
    return this.exams.filter(exam => exam.classId === classId);
  }

  /**
   * Get a specific exam by ID
   * @param examId - The exam ID
   * @returns The exam record or undefined
   */
  getExamById(examId: number): ExamRecord | undefined {
    return this.exams.find(exam => exam.id === examId);
  }

  /**
   * Replace all exams
   * @param exams - Array of exam records
   */
  replaceAll(exams: ExamRecord[]): void {
    this.exams = exams;
    this.refreshNextId();
  }

  /**
   * Add a new exam
   * @param exam - The exam record to add
   */
  addExam(exam: ExamRecord): void {
    this.exams.push(exam);
  }

  /**
   * Add a student exam record
   * @param studentExam - The student exam record to add
   */
  addStudentExam(studentExam: StudentExamRecord): void {
    this.studentExams.push(studentExam);
  }

  /**
   * Get all exams
   * @returns Array of all exams
   */
  getAllExams(): ExamRecord[] {
    return [...this.exams];
  }

  /**
   * Get all student exams
   * @returns Array of all student exams
   */
  getAllStudentExams(): StudentExamRecord[] {
    return [...this.studentExams];
  }

  /**
   * Update exam
   * @param examId - The exam ID to update
   * @param updatedExam - The updated exam data
   * @returns true if updated, false if not found
   */
  updateExam(examId: number, updatedExam: Partial<ExamRecord>): boolean {
    const exam = this.exams.find(e => e.id === examId);
    if (!exam) {
      return false;
    }

    Object.assign(exam, updatedExam);
    return true;
  }

  /**
   * Delete exam
   * @param examId - The exam ID to delete
   * @returns true if deleted, false if not found
   */
  deleteExam(examId: number): boolean {
    const index = this.exams.findIndex(e => e.id === examId);
    if (index === -1) {
      return false;
    }

    this.exams.splice(index, 1);
    // Also delete associated student exams
    this.studentExams = this.studentExams.filter(se => se.examId !== examId);
    return true;
  }

  /**
   * Update student exam answers
   * @param studentExamId - The student exam ID
   * @param answers - The updated answers
   * @returns true if updated, false if not found
   */
  updateStudentExamAnswers(
    studentExamId: number,
    answers: Array<{ questionId: number; answer: string }>
  ): boolean {
    const studentExam = this.studentExams.find(se => se.id === studentExamId);
    if (!studentExam) {
      return false;
    }

    studentExam.answers = answers;
    return true;
  }

  /**
   * Get student exam by ID
   * @param studentExamId - The student exam ID
   * @returns The student exam record or undefined
   */
  getStudentExamById(studentExamId: number): StudentExamRecord | undefined {
    return this.studentExams.find(se => se.id === studentExamId);
  }

  /**
   * Convert to JSON for persistence
   */
  toJSON() {
    return {
      exams: this.exams,
    };
  }

  /**
   * Create Exams instance from JSON data
   */
  static fromJSON(data: { exams?: ExamRecord[]; studentsExams?: StudentExamRecord[] }): Exams {
    return new Exams(
      data.exams || [],
      data.studentsExams || []
    );
  }
}
