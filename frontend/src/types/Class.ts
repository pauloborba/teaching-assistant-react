import { Enrollment } from './Enrollment';
import { Goal } from './Goal';

export interface Class {
  id: string;
  topic: string;
  semester: number;
  year: number;
  enrollments: Enrollment[];
  goals?: Goal[];
}

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

// Helper function to generate class ID
export const getClassId = (classObj: { topic: string; year: number; semester: number }): string => {
  return `${classObj.topic}-${classObj.year}-${classObj.semester}`;
};