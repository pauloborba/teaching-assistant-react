export type QuestionType = 'open' | 'closed';

export interface QuestionOption {
  id: number;
  option: string;
  isCorrect: boolean;
}

export interface Question {
  id: number;
  question: string;
  topic: string;
  type: QuestionType;
  options?: QuestionOption[];
  answer?: string;
}

export interface CreateQuestionPayload {
  question: string;
  topic: string;
  type: QuestionType;
  answer?: string;
  options?: Array<{
    option: string;
    isCorrect: boolean;
  }>;
}

export interface UpdateQuestionPayload {
  question?: string;
  topic?: string;
  type?: QuestionType;
  answer?: string;
  options?: Array<{
    option: string;
    isCorrect: boolean;
  }>;
}
