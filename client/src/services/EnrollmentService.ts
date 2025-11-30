import { Enrollment } from '../types/Enrollment';

const API_BASE_URL = 'http://localhost:3005';

class EnrollmentService {
  static async enrollStudent(classId: string, studentCPF: string): Promise<Enrollment> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/enroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentCPF }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to enroll student');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error enrolling student:', error);
      throw error;
    }
  }

  static async unenrollStudent(classId: string, studentCPF: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/enroll/${studentCPF}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unenroll student');
      }
    } catch (error) {
      console.error('Error unenrolling student:', error);
      throw error;
    }
  }

  static async getClassEnrollments(classId: string): Promise<Enrollment[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/enrollments`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch enrollments');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      throw error;
    }
  }

  static async updateEvaluation(classId: string, studentCPF: string, goal: string, grade: string): Promise<Enrollment> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/enrollments/${studentCPF}/evaluation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ goal, grade }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update evaluation');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error updating evaluation:', error);
      throw error;
    }
  }

  static async updateSelfEvaluation(classId: string, studentCPF: string, goal: string, grade: string): Promise<Enrollment> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/enrollments/${studentCPF}/selfEvaluation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ goal, grade }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update self-evaluation');
      }
      
      return response.json();
    } catch (error) {
      console.error('Error updating self-evaluation:', error);
      throw error;
    }
  }
}

export default EnrollmentService;