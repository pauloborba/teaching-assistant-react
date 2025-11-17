import { QuestionOption } from './QuestionOption';

export class Question {
  private id: number;
  private question: string;
  private topic: string;
  private type: 'open' | 'closed';
  private options?: QuestionOption[];
  private answer?: string;

  constructor(
    id: number,
    question: string,
    topic: string,
    type: 'open' | 'closed',
    options?: QuestionOption[],
    answer?: string
  ) {
    this.id = id;
    this.question = question;
    this.topic = topic;
    this.type = type;
    
    if (type === 'closed' && !options) {
      throw new Error('Closed questions must have options');
    }
    
    if (type === 'open' && !answer) {
      throw new Error('Open questions must have an answer');
    }

    this.options = options;
    this.answer = answer;
  }

  public getId(): number {
    return this.id;
  }

  public getQuestion(): string {
    return this.question;
  }

  public getTopic(): string {
    return this.topic;
  }

  public getType(): 'open' | 'closed' {
    return this.type;
  }

  public getOptions(): QuestionOption[] | undefined {
    return this.options ? [...this.options] : undefined;
  }

  public getAnswer(): string | undefined {
    return this.answer;
  }

  public getCorrectAnswer(): string | null {
    if (this.type === 'closed' && this.options) {
      const correctOption = this.options.find(opt => opt.getIsCorrect());
      return correctOption ? correctOption.getOption() : null;
    } else if (this.type === 'open' && this.answer) {
      return this.answer;
    }
    return null;
  }

  public setQuestion(question: string): void {
    this.question = question;
  }

  public setTopic(topic: string): void {
    this.topic = topic;
  }

  public setAnswer(answer: string): void {
    if (this.type === 'open') {
      this.answer = answer;
    } else {
      throw new Error('Cannot set answer for closed questions');
    }
  }

  public toJSON() {
    return {
      id: this.id,
      question: this.question,
      topic: this.topic,
      type: this.type,
      options: this.options?.map(opt => opt.toJSON()),
      answer: this.answer
    };
  }

  public static fromJSON(data: {
    id: number;
    question: string;
    topic: string;
    type: 'open' | 'closed';
    options?: Array<{ id: number; option: string; isCorrect: boolean }>;
    answer?: string;
  }): Question {
    const options = data.options?.map(opt => QuestionOption.fromJSON(opt));
    return new Question(
      data.id,
      data.question,
      data.topic,
      data.type,
      options,
      data.answer
    );
  }
}

