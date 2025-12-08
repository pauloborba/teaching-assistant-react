class ResponseService {
  // Use the same base API as the rest of the client (`/api/exams`)
  private readonly baseUrl = 'http://localhost:3005/api/exams';

  async getQuestions(examId: string | number): Promise<any[]> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(String(examId))}/questions`);
    if (!res.ok) throw new Error('Failed to fetch questions');
    return res.json();
  }

  async submitResponse(examId: string | number, studentCpf: string, answers: any[], token?: string): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${this.baseUrl}/${encodeURIComponent(String(examId))}/responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ studentCpf, answers }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }

  async getResponses(examId: string | number, token?: string): Promise<any[]> {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(String(examId))}/responses`, { headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to fetch responses');
    }
    return res.json();
  }

  async getExam(examId: string | number): Promise<any> {
    const res = await fetch(`${this.baseUrl}/${encodeURIComponent(String(examId))}`);
    if (!res.ok) throw new Error('Failed to fetch exam');
    return res.json();
  }
}

export default new ResponseService();
