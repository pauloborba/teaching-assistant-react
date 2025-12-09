import { TriggerAICorrectionRequest, TriggerAICorrectionResponse } from '../types/AICorrection';

const API_BASE_URL = 'http://localhost:3005';

class AICorrectionService {
  static async triggerAICorrection(
    examId: number,
    model: string
  ): Promise<TriggerAICorrectionResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/trigger-ai-correction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ examId, model }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to trigger AI correction');
      }

      return response.json();
    } catch (error) {
      console.error('Error triggering AI correction:', error);
      throw error;
    }
  }
}

export default AICorrectionService;

