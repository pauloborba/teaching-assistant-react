import { Student } from './Student';
import { Evaluation } from './Evaluation';

export interface Enrollment {
  student: Student;
  evaluations: Evaluation[];
  mediaPreFinal?: number;
  mediaPosFinal?: number;
  reprovadoPorFalta?: boolean;
  selfEvaluations: Evaluation[];
}

export interface CreateEnrollmentRequest {
  studentCPF: string;
  evaluations?: Evaluation[];
  mediaPreFinal?: number;
  mediaPosFinal?: number;
  reprovadoPorFalta?: boolean;
  selfEvaluations?: Evaluation[];
}

export interface UpdateEnrollmentRequest {
  evaluations?: Evaluation[];
  mediaPreFinal?: number;
  mediaPosFinal?: number;
  reprovadoPorFalta?: boolean;
  selfEvaluations?: Evaluation[];
}