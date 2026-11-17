import { Classes } from '../models/Classes';
import { Class } from '../models/Class';
import { Enrollment } from '../models/Enrollment';
import { SelfAssessmentRequest } from '../models/SelfAssessmentRequest';
import { NotFoundError } from '../models/DomainError';
import { cleanCPF } from '../models/CPF';
import { Clock } from './Clock';
import { DiscrepancyAnalyzer, DiscrepancyReport } from './DiscrepancyAnalyzer';

/**
 * Facade of the domain operations used by the routes (service). It finds the
 * objects the operation is about, asks the clock for the date, and lets the
 * domain objects apply their rules.
 */
export class Services {
  constructor(
    private readonly classes: Classes,
    private readonly clock: Clock,
    private readonly discrepancyAnalyzer: DiscrepancyAnalyzer = new DiscrepancyAnalyzer()
  ) {}

  /** The students of a class whose self-assessment diverges from the professor's grades. Changes nothing. */
  discrepancies(classId: string): DiscrepancyReport {
    return this.discrepancyAnalyzer.analyze(this.findClass(classId));
  }

  /** Changes the discrepancy threshold of a class; returns the threshold the class keeps. */
  changeDiscrepancyThreshold(classId: string, threshold: unknown): number {
    const classObj = this.findClass(classId);
    classObj.setDiscrepancyThreshold(threshold);
    return classObj.getDiscrepancyThreshold();
  }

  /** Replaces the self-assessment of a student with the submitted grades, given by goal. */
  submitSelfAssessment(studentCPF: string, classId: string, grades: unknown): Enrollment {
    return this.findClass(classId).submitSelfAssessment(cleanCPF(studentCPF), grades);
  }

  /** Requests the self-assessment of a class, with the given deadline (ISO date). */
  requestSelfAssessment(classId: string, deadline: string): SelfAssessmentRequest {
    return this.findClass(classId).requestSelfAssessment(deadline, this.clock.today());
  }

  /** Withdraws the self-assessment request of a class, if it has one. */
  cancelSelfAssessmentRequest(classId: string): void {
    this.findClass(classId).cancelSelfAssessmentRequest();
  }

  private findClass(classId: string): Class {
    const classObj = this.classes.findClassById(classId);
    if (!classObj) {
      throw new NotFoundError('Class not found');
    }
    return classObj;
  }
}
