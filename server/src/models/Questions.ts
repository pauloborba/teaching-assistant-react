export type QuestionType = 'open' | 'closed';

export interface QuestionOptionRecord {
  id: number;
  option: string;
  isCorrect: boolean;
}

export interface QuestionRecord {
  id: number;
  question: string;
  topic: string;
  type: QuestionType;
  options?: QuestionOptionRecord[];
  answer?: string;
}

export interface CreateOpenQuestionInput {
  question: string;
  topic: string;
  type: 'open';
  answer: string;
}

export interface CreateClosedQuestionInput {
  question: string;
  topic: string;
  type: 'closed';
  options: Array<{
    option: string;
    isCorrect: boolean;
  }>;
}

export type CreateQuestionInput = CreateOpenQuestionInput | CreateClosedQuestionInput;

export interface UpdateQuestionInput {
  question?: string;
  topic?: string;
  type?: QuestionType;
  answer?: string | null;
  options?: Array<{
    option: string;
    isCorrect: boolean;
  }>;
}

export class Questions {
  private questions: QuestionRecord[] = [];
  private nextId = 1;

  constructor(initialQuestions: QuestionRecord[] = []) {
    this.replaceAll(initialQuestions);
  }

  public replaceAll(questionList: QuestionRecord[]): void {
    this.questions = questionList.map(q => this.cloneQuestion(q));
    this.nextId = this.calculateNextId();
  }

  public getAllQuestions(): QuestionRecord[] {
    return this.questions.map(q => this.cloneQuestion(q));
  }

  public getQuestionById(id: number): QuestionRecord | undefined {
    const question = this.questions.find(q => q.id === id);
    return question ? this.cloneQuestion(question) : undefined;
  }

  public getQuestionsByIds(ids: number[]): QuestionRecord[] {
    const lookup = new Set(ids);
    return this.questions
      .filter(q => lookup.has(q.id))
      .map(q => this.cloneQuestion(q));
  }

  public getQuestionsByTopic(topic: string): QuestionRecord[] {
    return this.questions
      .filter(q => q.topic === topic)
      .map(q => this.cloneQuestion(q));
  }

  public addQuestion(input: CreateQuestionInput): QuestionRecord {
    const normalized = this.normalizeCreateInput(input);
    const newQuestion: QuestionRecord = {
      id: this.nextId++,
      ...normalized,
    };

    this.questions.push(newQuestion);
    return this.cloneQuestion(newQuestion);
  }

  public updateQuestion(id: number, input: UpdateQuestionInput): QuestionRecord | undefined {
    const existing = this.questions.find(q => q.id === id);
    if (!existing) {
      return undefined;
    }

    // Update text fields if provided
    if (typeof input.question === 'string') {
      existing.question = this.normalizeText(input.question, 'Question text');
    }

    if (typeof input.topic === 'string') {
      existing.topic = this.normalizeText(input.topic, 'Topic');
    }

    // Handle type transitions and field updates
    if (input.type && input.type !== existing.type) {
      existing.type = input.type;
      if (input.type === 'open') {
        existing.options = undefined;
        existing.answer = this.normalizeOpenAnswer(input.answer ?? existing.answer ?? '');
      } else {
        existing.answer = undefined;
        existing.options = this.normalizeClosedOptions(input.options ?? []);
      }
    } else if (existing.type === 'open') {
      if (input.answer !== undefined) {
        existing.answer = this.normalizeOpenAnswer(input.answer ?? '');
      }
    } else if (existing.type === 'closed') {
      if (input.options !== undefined) {
        existing.options = this.normalizeClosedOptions(input.options);
      }
    }

    return this.cloneQuestion(existing);
  }

  public deleteQuestion(id: number): boolean {
    const index = this.questions.findIndex(q => q.id === id);
    if (index === -1) {
      return false;
    }

    this.questions.splice(index, 1);
    return true;
  }

  public toJSON(): { questions: QuestionRecord[] } {
    return {
      questions: this.getAllQuestions(),
    };
  }

  public static fromJSON(data: { questions?: QuestionRecord[] }): Questions {
    return new Questions(data.questions || []);
  }

  private calculateNextId(): number {
    if (this.questions.length === 0) {
      return 1;
    }

    const maxId = this.questions.reduce((max, question) => Math.max(max, question.id), 0);
    return maxId + 1;
  }

  private normalizeCreateInput(input: CreateQuestionInput): Omit<QuestionRecord, 'id'> {
    const base = {
      question: this.normalizeText(input.question, 'Question text'),
      topic: this.normalizeText(input.topic, 'Topic'),
    };

    if (input.type === 'open') {
      return {
        ...base,
        type: 'open',
        answer: this.normalizeOpenAnswer(input.answer),
      };
    }

    return {
      ...base,
      type: 'closed',
      options: this.normalizeClosedOptions(input.options),
    };
  }

  private normalizeClosedOptions(options: Array<{ option: string; isCorrect: boolean }>): QuestionOptionRecord[] {
    if (!Array.isArray(options) || options.length === 0) {
      throw new Error('Closed questions must provide at least one option');
    }

    let hasCorrect = false;

    const sanitized = options.map((optionData, index) => {
      const optionText = this.normalizeText(optionData.option, `Option #${index + 1}`);
      const isCorrect = Boolean(optionData.isCorrect);
      if (isCorrect) {
        hasCorrect = true;
      }

      return {
        id: index + 1,
        option: optionText,
        isCorrect,
      };
    });

    if (!hasCorrect) {
      throw new Error('At least one option must be marked as correct');
    }

    return sanitized as QuestionOptionRecord[];
  }

  private normalizeOpenAnswer(answer: string): string {
    const normalized = this.normalizeText(answer, 'Answer');
    if (normalized.length === 0) {
      throw new Error('Open questions must include an answer');
    }
    return normalized;
  }

  private normalizeText(value: string, fieldName: string): string {
    if (typeof value !== 'string') {
      throw new Error(`${fieldName} must be a string`);
    }

    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error(`${fieldName} cannot be empty`);
    }

    return trimmed;
  }

  private cloneOptions(options?: QuestionOptionRecord[]): QuestionOptionRecord[] | undefined {
    if (!options) {
      return undefined;
    }

    return options.map(option => ({ ...option }));
  }

  private cloneQuestion(question: QuestionRecord): QuestionRecord {
    return {
      ...question,
      options: this.cloneOptions(question.options),
    };
  }
}
