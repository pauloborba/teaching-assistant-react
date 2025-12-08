import { Question, CreateQuestionPayload, UpdateQuestionPayload } from '../types/Question';

const API_BASE_URL = 'http://localhost:3005';

class QuestionService {
  static async getAllQuestions(topic?: string): Promise<Question[]> {
    const url = new URL(`${API_BASE_URL}/api/questions`);
    if (topic) {
      url.searchParams.append('topic', topic);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch questions');
    }

    const data = await response.json();
    return data.data ?? [];
  }

  static async getQuestionById(id: number): Promise<Question> {
    const response = await fetch(`${API_BASE_URL}/api/questions/${id}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch question');
    }

    return response.json();
  }

  static async createQuestion(payload: CreateQuestionPayload): Promise<Question> {
    const response = await fetch(`${API_BASE_URL}/api/questions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create question');
    }

    return response.json();
  }

  static async updateQuestion(id: number, payload: UpdateQuestionPayload): Promise<Question> {
    const response = await fetch(`${API_BASE_URL}/api/questions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update question');
    }

    return response.json();
  }

  static async deleteQuestion(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/questions/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to delete question');
    }
  }
}

export default QuestionService;
