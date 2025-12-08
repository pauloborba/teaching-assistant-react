export type Grade = 'MANA' | 'MPA' | 'MA';

export class Evaluation {
  private goal: string;
  private grade: Grade;

  constructor(goal: string, grade: Grade) {
    this.goal = goal;
    this.grade = grade;
  }

  public getGoal(): string {
    return this.goal;
  }

  public getGrade(): Grade {
    return this.grade;
  }

  public setGrade(grade: Grade): void {
    this.grade = grade;
  }

  public toJSON() {
    return {
      goal: this.goal,
      grade: this.grade
    };
  }

  // Create Evaluation from JSON object
  public static fromJSON(data: { goal: string; grade: Grade }): Evaluation {
    return new Evaluation(data.goal, data.grade);
  }
}

// Predefined evaluation goals
export const EVALUATION_GOALS = [
  'Requirements',
  'Configuration Management', 
  'Project Management',
  'Design',
  'Tests',
  'Refactoring',
  'Roteiro 1',
  'Roteiro 2',
  'Roteiro 3',
  'Roteiro 4',
  'Roteiro 5',
  'Roteiro 6'
] as const;