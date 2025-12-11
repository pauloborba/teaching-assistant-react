import { Exam } from '../types/Exam';
import { Student, CreateStudentRequest, UpdateStudentRequest } from '../types/Student';

export class StudentService {
  private readonly baseUrl = 'http://localhost:3005/api/students';

  // Get all students
  async getAllStudents(): Promise<Student[]> {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch students: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  }

  // Get student by CPF
  async getStudentByCPF(cpf: string): Promise<Student> {
    try {
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(cpf)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch student: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching student:', error);
      throw error;
    }
  }

  // Create a new student
  async createStudent(student: CreateStudentRequest): Promise<Student> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(student),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create student: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating student:', error);
      throw error;
    }
  }

  // Update student by CPF
  async updateStudent(cpf: string, updates: UpdateStudentRequest): Promise<Student> {
    try {
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(cpf)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update student: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  }

  // Delete student by CPF
  async deleteStudent(cpf: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(cpf)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete student: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  }

  // Update evaluation for a specific student and goal
  async updateEvaluation(cpf: string, goal: string, grade: string): Promise<Student> {
    try {
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(cpf)}/evaluation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ goal, grade }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update evaluation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating evaluation:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const studentService = new StudentService();