import { AverageCalculationSpecification } from './AverageCalculationSpecification';
import { Enrollment } from './Enrollment';

export interface Class {
  id: string;
  topic: string;
  semester: number;
  year: number;
  averageCalculationSpecification: AverageCalculationSpecification;
  /** The professor's request for the self-assessment (ISO dates), null while not made */
  selfAssessmentRequest?: SelfAssessmentRequest | null;
  /** Largest discrepancy between the self-assessment and the professor's grades that the class tolerates */
  discrepancyThreshold?: number;
  enrollments: Enrollment[];
}

export interface SelfAssessmentRequest {
  deadline: string;
  sentDate: string;
}

/** Fields a client provides to create or update a class (the server assigns the default average specification). */
export interface CreateClassRequest {
  topic: string;
  semester: number;
  year: number;
}

export interface UpdateClassRequest {
  topic?: string;
  semester?: number;
  year?: number;
}

/** Computes a class id the way the server does; prefer the id the server sends with each class. */
export const getClassId = (classObj: { topic: string; year: number; semester: number }): string => {
  return `${classObj.topic}-${classObj.year}-${classObj.semester}`;
};
