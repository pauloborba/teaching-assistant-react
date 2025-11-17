class ResponseService {
  private readonly baseUrl = 'http://localhost:3005/api/v1/exams';

  /**
   * Submit student responses for an exam.
   * @param examId Exam identifier
   * @param answers Object containing answers payload
   * @param token Optional auth token (Bearer)
   */
  async submitResponses(examId: string, answers: any, token?: string): Promise<any> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(examId)}/responses`, {
        method: 'POST',
        headers,
        body: JSON.stringify(answers),
      });

      // Handle common expected status codes from feature scenarios
      if (response.status === 201) {
        return await response.json();
      }

      if (response.status === 400) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || 'Invalid request payload');
      }

      if (response.status === 403) {
        throw new Error('Forbidden');
      }

      if (response.status === 410) {
        throw new Error('Exam submission period has ended.');
      }

      // Fallback for other non-ok statuses
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting responses:', error);
      throw error;
    }
  }

  /**
   * Optionally fetch exam details (useful to check open/closed status).
   * @param examId
   */
  async getExam(examId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(examId)}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch exam: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching exam:', error);
      throw error;
    }
  }
}

export default new ResponseService();
