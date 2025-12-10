import { Question, CreateQuestionPayload, UpdateQuestionPayload } from '../types/Question';

const API_BASE_URL = 'http://localhost:3005';

class QuestionService {
  private static async performRequest<T>(
    input: RequestInfo,
    init: RequestInit | undefined,
    fallbackError: string,
    parseBody = true,
  ): Promise<T> {
    const response = await fetch(input, init);
    let payload: any = {};

    if (parseBody) {
      payload = await response.json().catch(() => ({}));
    }

    if (!response.ok) {
      throw new Error(payload.error || fallbackError);
    }

    return payload as T;
  }

  static async getAllQuestions(topic?: string): Promise<Question[]> {
    const url = new URL(`${API_BASE_URL}/api/questions`);
    if (topic) {
      url.searchParams.append('topic', topic);
    }

    const data = await QuestionService.performRequest<{ data?: Question[] }>(
      url.toString(),
      undefined,
      'Failed to fetch questions',
    );
    return data.data ?? [];
  }

  static async getQuestionById(id: number): Promise<Question> {
    return QuestionService.performRequest<Question>(
      `${API_BASE_URL}/api/questions/${id}`,
      undefined,
      'Failed to fetch question',
    );
  }

  static async createQuestion(payload: CreateQuestionPayload): Promise<Question> {
    return QuestionService.performRequest<Question>(
      `${API_BASE_URL}/api/questions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      'Failed to create question',
    );
  }

  static async updateQuestion(id: number, payload: UpdateQuestionPayload): Promise<Question> {
    return QuestionService.performRequest<Question>(
      `${API_BASE_URL}/api/questions/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      'Failed to update question',
    );
  }

  static async deleteQuestion(id: number): Promise<void> {
    await QuestionService.performRequest<void>(
      `${API_BASE_URL}/api/questions/${id}`,
      {
        method: 'DELETE',
      },
      'Failed to delete question',
      false,
    );
  }
}

export default QuestionService;
