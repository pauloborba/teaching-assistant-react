import { Student } from './Student';
import { Evaluation } from './Evaluation';

export interface Enrollment {
  student: Student;
  evaluations: Evaluation[];
  /** Grades the student assigned to themselves */
  selfAssessments?: Evaluation[];
  averageBeforeFinalExam?: number;
  averageAfterFinalExam?: number;
  failedByAbsence?: boolean;
}

export interface CreateEnrollmentRequest {
  studentCPF: string;
  evaluations?: Evaluation[];
  averageBeforeFinalExam?: number;
  averageAfterFinalExam?: number;
  failedByAbsence?: boolean;
}

export interface UpdateEnrollmentRequest {
  evaluations?: Evaluation[];
  averageBeforeFinalExam?: number;
  averageAfterFinalExam?: number;
  failedByAbsence?: boolean;
}