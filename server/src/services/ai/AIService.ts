import { IAIService } from './IAIService';
import { AICorrectionRequest, AICorrectionResponse, AIServiceMetadata, AIServiceConfig, AIModel } from '../../types/AIModel';

/**
 * Abstract base class for AI services
 * Follows Template Method Pattern and Open/Closed Principle
 * 
 * This class provides:
 * - Common functionality for all AI services
 * - Template methods that can be overridden
 * - Error handling and validation
 * - Configuration management
 */
export abstract class AIService implements IAIService {
  protected config: AIServiceConfig;
  protected readonly defaultTimeout: number = 30000; // 30 seconds
  protected readonly defaultMaxRetries: number = 3;

  constructor(config: AIServiceConfig) {
    this.config = {
      timeout: this.defaultTimeout,
      maxRetries: this.defaultMaxRetries,
      ...config
    };
    this.validateConfig();
  }

  /**
   * Validates the service configuration
   * Template method - can be overridden by subclasses
   */
  protected validateConfig(): void {
    if (!this.config.model) {
      throw new Error('AI model must be specified');
    }
  }

  /**
   * Gets metadata about the AI service
   * Must be implemented by concrete classes
   */
  public abstract getMetadata(): AIServiceMetadata;

  /**
   * Corrects a student's answer using AI
   * Template method pattern - defines the algorithm structure
   */
  public async correctAnswer(request: AICorrectionRequest): Promise<AICorrectionResponse> {
    this.validateRequest(request);
    
    try {
      const response = await this.executeCorrection(request);
      return this.processResponse(response, request);
    } catch (error) {
      return this.handleError(error, request);
    }
  }

  /**
   * Validates the correction request
   * Template method - can be overridden for specific validations
   */
  protected validateRequest(request: AICorrectionRequest): void {
    if (!request.questionText) {
      throw new Error('Question text is required');
    }
    if (request.studentAnswer === undefined || request.studentAnswer === null) {
      throw new Error('Student answer is required');
    }
    if (!request.correctAnswer) {
      throw new Error('Correct answer is required');
    }
  }

  /**
   * Executes the actual AI correction
   * Must be implemented by concrete classes
   */
  protected abstract executeCorrection(request: AICorrectionRequest): Promise<any>;

  /**
   * Processes the raw AI response into a standardized format
   * Template method - can be overridden for specific processing
   */
  protected abstract processResponse(rawResponse: any, request: AICorrectionRequest): AICorrectionResponse;

  /**
   * Handles errors during correction
   * Template method - can be overridden for specific error handling
   */
  protected handleError(error: any, request: AICorrectionRequest): AICorrectionResponse {
    console.error(`Error correcting answer for question ${request.questionId}:`, error);
    
    // Tratamento específico para diferentes tipos de erro
    const statusCode = error.statusCode || (error.message?.match(/error: (\d+)/)?.[1]);
    
    let feedback = 'Erro ao processar correção. Por favor, tente novamente.';
    
    if (statusCode === '429' || statusCode === 429) {
      feedback = 'Quota da API do Gemini excedida. Por favor, aguarde alguns minutos e tente novamente.';
    } else if (statusCode === '401' || statusCode === 401) {
      feedback = 'Erro de autenticação com a API do Gemini. Verifique a chave da API.';
    } else if (statusCode === '400' || statusCode === 400) {
      feedback = 'Erro na requisição para a API do Gemini. Verifique os dados enviados.';
    }
    
    // Fallback: return a default response indicating error
    return {
      isCorrect: false,
      score: 0,
      feedback,
      confidence: 0
    };
  }

  /**
   * Validates if the service is properly configured
   * Must be implemented by concrete classes
   */
  public abstract validateConfiguration(): Promise<boolean>;

  /**
   * Gets the configured model
   */
  public getModel(): AIModel {
    return this.config.model;
  }

  /**
   * Gets the service configuration
   */
  protected getConfig(): AIServiceConfig {
    return this.config;
  }
}

