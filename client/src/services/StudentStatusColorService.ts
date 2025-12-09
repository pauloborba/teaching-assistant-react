import { StudentStatus } from '../types/StudentStatusColor';

class StudentStatusService {
  private baseUrl = 'http://localhost:3005/api/classes';

  async getStudentsStatusByClass(classId: string): Promise<StudentStatus[]> {
    const response = await fetch(
      `${this.baseUrl}/${encodeURIComponent(classId)}/students-status`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch students status');
    }

    return response.json();
  }
}

export default new StudentStatusService();
