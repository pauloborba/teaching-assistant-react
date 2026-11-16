import { Student } from './Student';

/** A student whose discrepancy could be computed. */
export interface StudentDiscrepancy {
  student: Student;
  /** Sum, over the goals that have both grades, of the levels between the self-assessment and the professor's grade */
  discrepancy: number;
  /** Whether the discrepancy is greater than the discrepancy threshold of the class */
  discrepant: boolean;
}

/** A student whose discrepancy could not be computed, and the grades that are missing. */
export interface UncomputableStudent {
  student: Student;
  missing: string;
}

/** What the server tells about the discrepancies of a class (same shape as the server's). */
export interface DiscrepancyReport {
  discrepancyThreshold: number;
  /** The students whose discrepancy could be computed, the greatest discrepancy first */
  students: StudentDiscrepancy[];
  uncomputable: UncomputableStudent[];
  discrepantCount: number;
  computableCount: number;
  /** Whole percentage of the computable students that are discrepant */
  discrepantPercentage: number;
}
