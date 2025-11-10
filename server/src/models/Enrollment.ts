import { Student } from './Student';
import { Evaluation } from './Evaluation';

export class Enrollment {
  private student: Student;
  private evaluations: Evaluation[];
  private average: GLfloat;

  constructor(student: Student, evaluations: Evaluation[] = [], average: GLfloat = 0) {
    this.student = student;
    this.evaluations = evaluations;
    this.average = average;
  }

  // Get student
  getStudent(): Student {
    return this.student;
  }

  // Get evaluations
  getEvaluations(): Evaluation[] {
    return [...this.evaluations]; // Return copy to prevent external modification
  }

  getAverage(): GLfloat{
    return this.average;
  }

  // Add or update an evaluation
  addOrUpdateEvaluation(goal: string, grade: 'MANA' | 'MPA' | 'MA'): void {
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

  // Get evaluation for a specific goal
  getEvaluationForGoal(goal: string): Evaluation | undefined {
    return this.evaluations.find(evaluation => evaluation.getGoal() === goal);
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      student: this.student.toJSON(),
      evaluations: this.evaluations.map(evaluation => evaluation.toJSON())
    };
  }

  // Create Enrollment from JSON object
  static fromJSON(data: { student: any; evaluations: any[] }, student: Student): Enrollment {
    const evaluations = data.evaluations
      ? data.evaluations.map((evalData: any) => Evaluation.fromJSON(evalData))
      : [];
    
    return new Enrollment(student, evaluations);
  }
}