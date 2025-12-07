import { Student } from './Student';
import { Evaluation } from './Evaluation';

export class Enrollment {
  private student: Student;
  private evaluations: Evaluation[];
  private mediaPreFinal: number | null;
  private mediaPosFinal: number | null;
  private reprovadoPorFalta: Boolean;

  constructor(student: Student, evaluations: Evaluation[] = [], mediaPreFinal: number | null = null, mediaPosFinal: number | null = null, reprovadoPorFalta: Boolean = false) {
    this.student = student;
    this.evaluations = evaluations;
    this.mediaPreFinal = mediaPreFinal;
    this.mediaPosFinal = mediaPosFinal;
    this.reprovadoPorFalta = reprovadoPorFalta;
  }

  getStudent(): Student {
    return this.student;
  }

  getEvaluations(): Evaluation[] {
    return [...this.evaluations];
  }

  calculateMediaPreFinal(): number {
    throw new Error('calculateMedia() not implemented yet');
  }

  
  calculateMediaPosFinal(): number {
    throw new Error('calculateMedia() not implemented yet');
  }

  
  getMediaPreFinal(): number | null {
    return this.mediaPreFinal;
  }

  
  setMediaPreFinal(mediaPreFinal: number){
    this.mediaPreFinal = mediaPreFinal;
  }

  
  getMediaPosFinal(): number | null {
    return this.mediaPosFinal;
  }

  
  setMediaPosFinal(mediaPosFinal: number){
    this.mediaPosFinal = mediaPosFinal;
  }

  
  getReprovadoPorFalta(): Boolean {
    return this.reprovadoPorFalta;
  }
  
  
  setReprovadoPorFalta(reprovadoPorFalta: Boolean){
    this.reprovadoPorFalta = reprovadoPorFalta;
  }

  
  addOrUpdateEvaluation(goal: string, grade: 'MANA' | 'MPA' | 'MA'): void {
    const existingIndex = this.evaluations.findIndex(evaluation => evaluation.getGoal() === goal);
    if (existingIndex >= 0) {
      this.evaluations[existingIndex].setGrade(grade);
    } else {
      this.evaluations.push(new Evaluation(goal, grade));
    }
  }

  
  removeEvaluation(goal: string): boolean {
    const existingIndex = this.evaluations.findIndex(evaluation => evaluation.getGoal() === goal);
    if (existingIndex >= 0) {
      this.evaluations.splice(existingIndex, 1);
      return true;
    }
    return false;
  }

  
  getEvaluationForGoal(goal: string): Evaluation | undefined {
    return this.evaluations.find(evaluation => evaluation.getGoal() === goal);
  }

  
  toJSON() {
    return {
      student: this.student.toJSON(),
      evaluations: this.evaluations.map(evaluation => evaluation.toJSON()),
      mediaPreFinal: this.mediaPreFinal,
      mediaPosFinal: this.mediaPosFinal,
      reprovadoPorFalta: this.reprovadoPorFalta
    };
  }

  
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
