import { AIService } from './AIService';
import { AICorrectionRequest, AICorrectionResponse, AIServiceMetadata, AIServiceConfig, AIModel } from '../../types/AIModel';

/**
 * Concrete implementation of AIService for Google Gemini 2.5 Flash
 * Follows Single Responsibility Principle - handles only Gemini-specific logic
 * Follows Liskov Substitution Principle - can replace AIService anywhere
 */
export class GeminiService extends AIService {
  private readonly geminiApiUrl: string = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  private readonly modelVersion: string = '2.5 Flash';

  constructor(config: AIServiceConfig) {
    super(config);
    if (config.model !== AIModel.GEMINI_2_5_FLASH) {
      throw new Error('GeminiService only supports Gemini 2.5 Flash model');
    }
  }

  /**
   * Validates Gemini-specific configuration
   */
  protected override validateConfig(): void {
    super.validateConfig();
    
    if (!this.config.apiKey) {
      throw new Error('Gemini API key is required');
    }
  }

  /**
   * Gets metadata about the Gemini service
   */
  public getMetadata(): AIServiceMetadata {
    return {
      model: AIModel.GEMINI_2_5_FLASH,
      name: 'Google Gemini',
      version: this.modelVersion,
      capabilities: [
        'Text correction',
        'Open-ended question grading',
        'Feedback generation',
        'Confidence scoring'
      ]
    };
  }

  /**
   * Executes the correction using Gemini API
   */
  protected async executeCorrection(request: AICorrectionRequest): Promise<any> {
    const prompt = this.buildPrompt(request);
    const apiKey = this.config.apiKey!;

    const response = await fetch(`${this.geminiApiUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      }),
      signal: AbortSignal.timeout(this.config.timeout || this.defaultTimeout)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Unknown error';
      const statusCode = response.status;
      
      // Cria um erro mais específico para diferentes códigos de status
      const error = new Error(`Gemini API error: ${statusCode} - ${errorMessage}`);
      (error as any).statusCode = statusCode;
      (error as any).errorData = errorData;
      throw error;
    }

    return await response.json();
  }

  /**
   * Builds the prompt for Gemini API
   */
  private buildPrompt(request: AICorrectionRequest): string {
    const context = request.context || 'Você é um professor corrigindo uma prova.';
    
    let prompt = `${context}\n\n`;
    prompt += `Questão: ${request.questionText}\n`;
    prompt += `Tipo: ${request.questionType === 'open' ? 'Questão Aberta' : 'Questão Fechada'}\n\n`;
    prompt += `Resposta do estudante: "${request.studentAnswer}"\n`;
    prompt += `Resposta correta: "${request.correctAnswer}"\n\n`;
    prompt += `Por favor, avalie a resposta do estudante e retorne um JSON com o seguinte formato:\n`;
    prompt += `{\n`;
    prompt += `  "isCorrect": true/false,\n`;
    prompt += `  "score": 0-10,\n`;
    prompt += `  "feedback": "feedback detalhado",\n`;
    prompt += `  "confidence": 0.0-1.0\n`;
    prompt += `}\n\n`;
    prompt += `Para questões fechadas, considere apenas se a resposta está exatamente correta.\n`;
    prompt += `Para questões abertas, seja mais flexível e considere sinônimos e variações aceitáveis.`;

    return prompt;
  }

  /**
   * Processes the Gemini API response
   */
  protected processResponse(rawResponse: any, request: AICorrectionRequest): AICorrectionResponse {
    try {
      // Extract text from Gemini response
      const text = rawResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) {
        throw new Error('No response text from Gemini');
      }

      // Try to parse JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in Gemini response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize the response
      return {
        isCorrect: Boolean(parsed.isCorrect),
        score: this.normalizeScore(parsed.score),
        feedback: parsed.feedback || this.generateDefaultFeedback(parsed.isCorrect),
        confidence: this.normalizeConfidence(parsed.confidence)
      };
    } catch (error) {
      console.error('Error processing Gemini response:', error);
      // Fallback to simple comparison for closed questions
      if (request.questionType === 'closed') {
        return this.fallbackCorrection(request);
      }
      throw error;
    }
  }

  /**
   * Normalizes score to 0-10 range
   */
  private normalizeScore(score: any): number {
    const num = Number(score);
    if (isNaN(num)) return 0;
    return Math.max(0, Math.min(10, num));
  }

  /**
   * Normalizes confidence to 0-1 range
   */
  private normalizeConfidence(confidence: any): number {
    const num = Number(confidence);
    if (isNaN(num)) return 0.5;
    return Math.max(0, Math.min(1, num));
  }

  /**
   * Generates default feedback if not provided
   */
  private generateDefaultFeedback(isCorrect: boolean): string {
    return isCorrect 
      ? 'Resposta correta!' 
      : 'Resposta incorreta. Revise o conteúdo estudado.';
  }

  /**
   * Fallback correction for closed questions when AI fails
   */
  private fallbackCorrection(request: AICorrectionRequest): AICorrectionResponse {
    const normalizedStudent = this.normalizeString(request.studentAnswer);
    const normalizedCorrect = this.normalizeString(request.correctAnswer);
    const isCorrect = normalizedStudent === normalizedCorrect;

    return {
      isCorrect,
      score: isCorrect ? 10 : 0,
      feedback: isCorrect ? 'Resposta correta!' : 'Resposta incorreta.',
      confidence: isCorrect ? 1.0 : 0.0
    };
  }

  /**
   * Normalizes string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Validates Gemini service configuration
   */
  public async validateConfiguration(): Promise<boolean> {
    try {
      if (!this.config.apiKey) {
        return false;
      }

      // Optionally, make a test API call to validate
      // For now, just check if API key is present
      return true;
    } catch (error) {
      console.error('Error validating Gemini configuration:', error);
      return false;
    }
  }
}

