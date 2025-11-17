export interface TriggerAICorrectionRequest {
  classId: string;
  model: string;
}

export interface TriggerAICorrectionResponse {
  message: string;
  estimatedTime: string;
  totalStudentExams: number;
  totalOpenQuestions: number;
  queuedMessages: number;
  errors?: string[];
}

