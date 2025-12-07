import { Enrollment } from './Enrollment';

export interface Class {
  id: string;
  topic: string;
  semester: number;
  year: number;
  enrollments: Enrollment[];
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


export const getClassId = (classObj: { topic: string; year: number; semester: number }): string => {
  return `${classObj.topic}-${classObj.year}-${classObj.semester}`;
};