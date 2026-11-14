import { DomainError } from './DomainError';
import { isIsoDate } from './Dates';

/**
 * The professor's request for the self-assessment of a class (value object):
 * the deadline and the date it was sent, both ISO dates (yyyy-mm-dd).
 */
export class SelfAssessmentRequest {
  constructor(readonly deadline: string, readonly sentDate: string) {
    if (!isIsoDate(deadline) || !isIsoDate(sentDate)) {
      throw new DomainError('Deadline must be a date in the format yyyy-mm-dd');
    }
  }

  /** The self-assessment can be changed up to, and including, the deadline. */
  isOpenOn(today: string): boolean {
    return today <= this.deadline;
  }

  toJSON() {
    return { deadline: this.deadline, sentDate: this.sentDate };
  }

  static fromJSON(data: { deadline: string; sentDate: string }): SelfAssessmentRequest {
    return new SelfAssessmentRequest(data.deadline, data.sentDate);
  }
}
