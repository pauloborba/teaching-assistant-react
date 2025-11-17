import { Question } from './Question';

export class QuestionSet {
  private questions: Question[] = [];

  constructor() {
    // QuestionSet is independent of persistence
  }

  public addQuestion(question: Question): Question {
    if (this.findQuestionById(question.getId())) {
      throw new Error('Question with this ID already exists');
    }
    this.questions.push(question);
    return question;
  }

  public removeQuestion(id: number): boolean {
    const index = this.questions.findIndex(q => q.getId() === id);
    if (index === -1) {
      return false;
    }
    this.questions.splice(index, 1);
    return true;
  }

  public findQuestionById(id: number): Question | undefined {
    return this.questions.find(q => q.getId() === id);
  }

  public getAllQuestions(): Question[] {
    return [...this.questions];
  }

  public getQuestionsByType(type: 'open' | 'closed'): Question[] {
    return this.questions.filter(q => q.getType() === type);
  }

  public getQuestionsByTopic(topic: string): Question[] {
    return this.questions.filter(q => q.getTopic() === topic);
  }

  public getCount(): number {
    return this.questions.length;
  }
}

