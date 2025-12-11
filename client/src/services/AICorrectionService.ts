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
        // Tenta ler o JSON do erro da API
        let errorData;
        try {
          const responseText = await response.text();
          if (responseText) {
            errorData = JSON.parse(responseText);
          }
        } catch (jsonError) {
          // Se não conseguir ler o JSON, usa a mensagem do status
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        
        // Se conseguiu ler o JSON, usa a mensagem de erro da API
        if (errorData && errorData.error) {
          throw new Error(errorData.error);
        } else {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
      }

      return response.json();
    } catch (error) {
      console.error('Error triggering AI correction:', error);
      
      // Se for um erro de rede (TypeError do fetch), mantém a mensagem original
      // mas tenta fornecer uma mensagem mais útil
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Erro de conexão. Verifique se o servidor está rodando.');
      }
      
      // Se já for um Error com mensagem personalizada, apenas re-lança
      throw error;
    }
  }
}

export default AICorrectionService;

