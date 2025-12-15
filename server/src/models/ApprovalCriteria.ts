import { Enrollment } from './Enrollment';

export type StudentStatus = 
  | 'APPROVED'
  | 'APPROVED_FINAL'
  | 'FAILED'
  | 'FAILED_BY_ABSENCE'
  | 'PENDING';

export interface IApprovalCriteria {
  readonly directApprovalThreshold: number;
  readonly finalExamEligibilityThreshold: number;
  readonly postFinalApprovalThreshold: number;
  
  /**
   * Determines the student status based on their grades and enrollment data.
   * @param enrollment The student's enrollment data
   * @param mediaPreFinal The calculated pre-final average (null if no data)
   * @returns Student's approval status
   */
  determineStatus(enrollment: Enrollment, mediaPreFinal: number | null): StudentStatus;
}

/**
 * Default approval criteria.
 * 
 * Thresholds:
 * - Direct approval: average >= 7.0
 * - Final exam eligibility: average >= 3.0 and < 7.0
 * - Post-final approval: final average >= 5.0
 * - Direct failure: average < 3.0
 */
export class DefaultApprovalCriteria implements IApprovalCriteria {
  readonly directApprovalThreshold: number = 7.0;
  readonly finalExamEligibilityThreshold: number = 3.0;
  readonly postFinalApprovalThreshold: number = 5.0;

  determineStatus(enrollment: Enrollment, mediaPreFinal: number | null): StudentStatus {
    if (enrollment.getReprovadoPorFalta()) {
      return 'FAILED_BY_ABSENCE';
    }

    const mediaPosFinal = enrollment.getMediaPosFinal();

    if (mediaPosFinal !== null && mediaPosFinal !== 0) {
      if (mediaPosFinal >= this.postFinalApprovalThreshold) {
        return 'APPROVED_FINAL';
      }
      return 'FAILED';
    }

    if (mediaPreFinal === null) {
      return 'PENDING';
    }

    if (mediaPreFinal >= this.directApprovalThreshold) {
      return 'APPROVED';
    }

    if (mediaPreFinal < this.finalExamEligibilityThreshold) {
      return 'FAILED';
    }

    return 'PENDING';
  }
}
