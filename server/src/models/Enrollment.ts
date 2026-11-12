import { Student } from './Student';
import { Evaluation, Grade } from './Evaluation';

/**
 * A student's participation in a class: the grades the professor assigned to
 * the learning goals, the grades the student assigned to themselves
 * (self-assessment), the averages (null until computed) and whether the
 * student failed by absence. At most one grade per goal in each collection.
 */
export class Enrollment {
  private student: Student;
  private evaluations: Evaluation[];
  // Student's average before the final exam (null until computed)
  private averageBeforeFinalExam: number | null;
  // Student's average after the final exam (null until computed)
  private averageAfterFinalExam: number | null;
  private failedByAbsence: boolean;
  // Grades the student assigned to themselves
  private selfAssessments: Evaluation[];

  constructor(student: Student, evaluations: Evaluation[] = [], averageBeforeFinalExam: number | null = null, averageAfterFinalExam: number | null = null, failedByAbsence: boolean = false, selfAssessments: Evaluation[] = []) {
    this.student = student;
    this.evaluations = evaluations;
    this.selfAssessments = selfAssessments;
    this.averageBeforeFinalExam = averageBeforeFinalExam;
    this.averageAfterFinalExam = averageAfterFinalExam;
    this.failedByAbsence = failedByAbsence;
  }

  // Get student
  getStudent(): Student {
    return this.student;
  }

  // Get evaluations
  getEvaluations(): Evaluation[] {
    return [...this.evaluations]; // Return copy to prevent external modification
  }

  // Computes the student's average before the final exam
  calculateAverageBeforeFinalExam(): number {
    throw new Error('calculateAverage() not implemented yet');
  }

  // Computes the student's average after the final exam
  calculateAverageAfterFinalExam(): number {
    throw new Error('calculateAverage() not implemented yet');
  }

  // Get the student's average before the final exam
  getAverageBeforeFinalExam(): number | null {
    return this.averageBeforeFinalExam;
  }

  // Set the student's average before the final exam
  setAverageBeforeFinalExam(averageBeforeFinalExam: number | null){
    this.averageBeforeFinalExam = averageBeforeFinalExam;
  }

  // Get the student's average after the final exam
  getAverageAfterFinalExam(): number | null {
    return this.averageAfterFinalExam;
  }

  // Set the student's average after the final exam
  setAverageAfterFinalExam(averageAfterFinalExam: number | null){
    this.averageAfterFinalExam = averageAfterFinalExam;
  }

  // Get whether the student failed by absence
  getFailedByAbsence(): boolean {
    return this.failedByAbsence;
  }
  
  // Set whether the student failed by absence
  setFailedByAbsence(failedByAbsence: boolean){
    this.failedByAbsence = failedByAbsence;
  }

  // Add or update an evaluation
  addOrUpdateEvaluation(goal: string, grade: Grade): void {
    const existingIndex = this.evaluations.findIndex(evaluation => evaluation.getGoal() === goal);
    if (existingIndex >= 0) {
      this.evaluations[existingIndex].setGrade(grade);
    } else {
      this.evaluations.push(new Evaluation(goal, grade));
    }
  }

  // Remove an evaluation
  removeEvaluation(goal: string): boolean {
    const existingIndex = this.evaluations.findIndex(evaluation => evaluation.getGoal() === goal);
    if (existingIndex >= 0) {
      this.evaluations.splice(existingIndex, 1);
      return true;
    }
    return false;
  }

  /** The grades the student assigned to themselves, at most one per goal. */
  getSelfAssessments(): Evaluation[] {
    return [...this.selfAssessments];
  }

  /** Registers or updates the grade the student assigns to themselves for a goal. */
  setSelfAssessment(goal: string, grade: Grade): void {
    const existing = this.selfAssessments.find(evaluation => evaluation.getGoal() === goal);
    if (existing) {
      existing.setGrade(grade);
    } else {
      this.selfAssessments.push(new Evaluation(goal, grade));
    }
  }

  /** Removes the grade the student assigned to themselves for a goal; tells whether there was one. */
  removeSelfAssessment(goal: string): boolean {
    const index = this.selfAssessments.findIndex(evaluation => evaluation.getGoal() === goal);
    if (index < 0) {
      return false;
    }
    this.selfAssessments.splice(index, 1);
    return true;
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
      selfAssessments: this.selfAssessments.map(evaluation => evaluation.toJSON()),
      averageBeforeFinalExam: this.averageBeforeFinalExam,
      averageAfterFinalExam: this.averageAfterFinalExam,
      failedByAbsence: this.failedByAbsence
    };
  }

  // Create Enrollment from JSON object
  static fromJSON(data: { 
    student: any; 
    evaluations: any[];
    selfAssessments?: any[];
    averageBeforeFinalExam?: number | null;
    averageAfterFinalExam?: number | null;
    failedByAbsence?: boolean;
  }, student: Student): Enrollment {
    const evaluations = data.evaluations
      ? data.evaluations.map((evalData: any) => Evaluation.fromJSON(evalData))
      : [];
    
    const averageBeforeFinalExam = data.averageBeforeFinalExam ?? null;
    const averageAfterFinalExam = data.averageAfterFinalExam ?? null;
    const failedByAbsence = data.failedByAbsence ?? false;
    
    // Absent from JSON written before the self-assessment existed
    const selfAssessments = Array.isArray(data.selfAssessments)
      ? data.selfAssessments.map((evalData: any) => Evaluation.fromJSON(evalData))
      : [];

    return new Enrollment(student, evaluations, averageBeforeFinalExam, averageAfterFinalExam, failedByAbsence, selfAssessments);
  }
}
