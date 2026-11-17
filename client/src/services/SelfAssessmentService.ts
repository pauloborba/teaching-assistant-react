import { Enrollment } from '../types/Enrollment';
import { sendJson } from './apiClient';
import { classPath } from './ClassService';

/** Access to the self-assessment students submit. */
export const selfAssessmentService = {
  /**
   * Submits the whole self-assessment of a student: the grade of each graded
   * goal. It replaces the previous submission.
   */
  submit: (classId: string, studentCPF: string, grades: Record<string, string>): Promise<Enrollment> =>
    sendJson('PUT', `${classPath(classId)}/enrollments/${studentCPF}/self-assessment`, { grades },
      'Failed to submit the self-assessment')
};
