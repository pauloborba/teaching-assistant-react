/** Dados de um aluno em um roteiro específico. O tempo é informado em minutos. */
export interface StudentResponseData {
  studentId: string;
  name: string;
  grade: number;
  responseTime: number;
}

export type CorrelationClassification =
  | 'perfect positive correlation'
  | 'positive correlation'
  | 'no linear correlation'
  | 'negative correlation'
  | 'perfect negative correlation';

/** Resultado devolvido por POST /api/response-time-report. */
export interface ResponseTimeReportData {
  averageResponseTime: number;
  averageGrade: number;
  standardDeviationResponseTime: number;
  standardDeviationGrade: number;
  correlationCoefficient: number | null;
  correlationClassification: CorrelationClassification | null;
  correlationError: string | null;
}

export interface GenerateResponseTimeReportRequest {
  /** Respostas de um único roteiro; não misturar roteiros diferentes. */
  responses: StudentResponseData[];
}
