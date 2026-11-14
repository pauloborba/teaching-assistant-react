import { Enrollment } from '../types/Enrollment';
import { request, sendJson } from './apiClient';
import { classPath } from './ClassService';

const gradePath = (classId: string, studentCPF: string, goal: string) =>
  `${classPath(classId)}/enrollments/${studentCPF}/self-assessment/${encodeURIComponent(goal)}`;

/** Access to the grades students assign to themselves (self-assessment). */
export const selfAssessmentService = {
  /** Stores the grade the student assigns to themselves for a goal. */
  setGrade: (classId: string, studentCPF: string, goal: string, grade: string): Promise<Enrollment> =>
    sendJson('PUT', gradePath(classId, studentCPF, goal), { grade }, 'Failed to save the self-assessment'),

  /** Removes the grade the student assigned to themselves for a goal. */
  removeGrade: (classId: string, studentCPF: string, goal: string): Promise<Enrollment> =>
    request(gradePath(classId, studentCPF, goal), 'Failed to save the self-assessment', { method: 'DELETE' })
};
