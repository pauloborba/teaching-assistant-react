import { Student } from './Student';
import { Evaluation } from './Evaluation';

export class Enrollment {
  private student: Student;
  private evaluations: Evaluation[];
  // Média do estudante antes da prova final
  private mediaPreFinal: number | null;
  // Média do estudante depois da final
  private mediaPosFinal: number | null;
  private reprovadoPorFalta: Boolean;

  constructor(student: Student, evaluations: Evaluation[] = [], mediaPreFinal: number | null = null, mediaPosFinal: number | null = null, reprovadoPorFalta: Boolean = false) {
    this.student = student;
    this.evaluations = evaluations;
    this.mediaPreFinal = mediaPreFinal;
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

  // Calcula a média do estudante antes da prova final
  calculateMediaPreFinal(): number {
    throw new Error('calculateMedia() not implemented yet');
  }

  // Calcula a média do estudante depois da prova final
  calculateMediaPosFinal(): number {
    throw new Error('calculateMedia() not implemented yet');
  }

  // Get media do estudante antes da prova final
  getMediaPreFinal(): number | null {
    return this.mediaPreFinal;
  }

  // Set media do estudante antes da prova final
  setMediaPreFinal(mediaPreFinal: number){
    this.mediaPreFinal = mediaPreFinal;
  }

  // Get média do estudante depois da final
  getMediaPosFinal(): number | null {
    return this.mediaPosFinal;
  }

  // Set média do estudante depois da final
  setMediaPosFinal(mediaPosFinal: number){
    this.mediaPosFinal = mediaPosFinal;
  }

  // Get reprovado por falta 
  getReprovadoPorFalta(): Boolean {
    return this.reprovadoPorFalta;
  }
  
  // Set reprovado por falta
  setReprovadoPorFalta(reprovadoPorFalta: Boolean){
    this.reprovadoPorFalta = reprovadoPorFalta;
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
      evaluations: this.evaluations.map(evaluation => evaluation.toJSON()),
      mediaPreFinal: this.mediaPreFinal,
      mediaPosFinal: this.mediaPosFinal,
      reprovadoPorFalta: this.reprovadoPorFalta
    };
  }

  // Create Enrollment from JSON object
  static fromJSON(data: { 
    student: any; 
    evaluations: any[];
    mediaPreFinal?: number;
    mediaPosFinal?: number;
    reprovadoPorFalta?: boolean;
  }, student: Student): Enrollment {
    const evaluations = data.evaluations
      ? data.evaluations.map((evalData: any) => Evaluation.fromJSON(evalData))
      : [];
    
    const mediaPreFinal = data.mediaPreFinal ?? 0;
    const mediaPosFinal = data.mediaPosFinal ?? 0;
    const reprovadoPorFalta = data.reprovadoPorFalta ?? false;
    
    return new Enrollment(student, evaluations, mediaPreFinal, mediaPosFinal, reprovadoPorFalta);
  }
}
