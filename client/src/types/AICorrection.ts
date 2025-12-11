export interface TriggerAICorrectionRequest {
  examId: number;
  model: string;
}

export interface TriggerAICorrectionResponse {
  message: string;
  estimatedTime: string;
  totalResponses: number;
  totalOpenQuestions: number;
  queuedMessages: number;
  errors?: string[];
}

