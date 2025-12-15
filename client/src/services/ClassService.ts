import { Class } from '../types/Class';
import { ReportData } from '../types/Report';

const API_BASE_URL = 'http://localhost:3005';

class ClassService {
  static async getAllClasses(): Promise<Class[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }
  }

  static async addClass(classData: Omit<Class, 'id' | 'enrollments'>): Promise<Class> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add class');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error adding class:', error);
      throw error;
    }
  }

  static async updateClass(classId: string, classData: Omit<Class, 'id' | 'enrollments'>): Promise<Class> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(classData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update class');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error updating class:', error);
      throw error;
    }
  }

  static async deleteClass(classId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      throw error;
    }
  }

  static async getClassReport(classId: string): Promise<ReportData> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/report`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch class report');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error fetching class report:', error);
      throw error;
    }
  }

}

// Utility: Fetch multiple class reports and handle errors for comparison scenarios
// Usage: fetchClassReportsForComparison(['id1', 'id2'])
export async function fetchClassReportsForComparison(classIds: string[]): Promise<
  { reports: { [classId: string]: ReportData }, error?: string }
> {
  if (classIds.length < 2) {
    return { reports: {}, error: 'At least two classes are required for comparison.' };
  }

  const reports: { [classId: string]: ReportData } = {};
  for (const classId of classIds) {
    try {
      const report = await ClassService.getClassReport(classId);
      // Consider a report missing if it is null, undefined, or empty object
      if (!report || Object.keys(report).length === 0) {
        return { reports: {}, error: 'One or more selected classes do not have available report.' };
      }
      reports[classId] = report;
    } catch (err) {
      return { reports: {}, error: 'One or more selected classes do not have available report.' };
    }
  }
  return { reports };
}

export default ClassService;