import { DiscrepancyReport } from '../types/Discrepancy';
import { get, sendJson } from './apiClient';
import { classPath } from './ClassService';

/** Access to the discrepancies between the self-assessment and the professor's grades. */
export const discrepancyService = {
  /** The discrepant students of a class, and those whose discrepancy could not be computed. */
  getDiscrepancies: (classId: string): Promise<DiscrepancyReport> =>
    get(`${classPath(classId)}/discrepancies`, 'Failed to fetch the discrepancies'),

  /** Changes the discrepancy threshold of a class; the server rejects anything but a non-negative integer. */
  changeThreshold: (classId: string, threshold: number): Promise<{ discrepancyThreshold: number }> =>
    sendJson('PUT', `${classPath(classId)}/discrepancy-threshold`, { threshold }, 'Failed to change the discrepancy threshold')
};
