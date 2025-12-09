export type StudentStatus = 
  | 'APPROVED'
  | 'APPROVED_FINAL'
  | 'FAILED'
  | 'FAILED_BY_ABSENCE'
  | 'PENDING';

export interface EvaluationPerformance {
  goal: string;
  averageGrade: number | null;
  gradeDistribution: {
    MANA: number;
    MPA: number;
    MA: number;
  };
  evaluatedStudents: number;
}

export interface StatusCounts {
  approvedCount: number;
  approvedFinalCount: number;
  notApprovedCount: number;
  failedByAbsenceCount: number;
  pendingCount: number;
}

export interface ReportFilter {
  type: 'ALL' | 'APPROVED' | 'APPROVED_FINAL' | 'FAILED' | 'FAILED_BY_ABSENCE' | 'PENDING' | 'BELOW_AVERAGE' | 'BELOW_THRESHOLD';
  threshold?: number; 
}

export interface StudentEntry {
  studentId: string;
  name: string;
  finalGrade: number | null;
  status: StudentStatus;
}

export interface ReportData {
  classId: string;
  topic: string;
  semester: number;
  year: number;
  totalEnrolled: number;
  studentsAverage: number | null;
  approvedCount: number;
  approvedFinalCount: number;
  notApprovedCount: number;
  failedByAbsenceCount: number;
  pendingCount: number;
  evaluationPerformance: EvaluationPerformance[];
  students: StudentEntry[]; 
  generatedAt: Date;
}