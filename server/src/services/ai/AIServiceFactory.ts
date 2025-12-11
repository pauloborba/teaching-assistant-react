import { IAIService } from './IAIService';
import { AIServiceConfig, AIModel } from '../../types/AIModel';
import { GeminiService } from './GeminiService';

/**
 * Factory class for creating AI service instances
 * Follows Factory Pattern and Dependency Inversion Principle
 * 
 * This class:
 * - Centralizes the creation of AI service instances
 * - Allows easy extension for new models (Open/Closed Principle)
 * - Hides the complexity of service instantiation
 */
export class AIServiceFactory {
  /**
   * Creates an AI service instance based on the model
   * @param config Configuration for the AI service
   * @returns An instance of the appropriate AI service
   * @throws Error if the model is not supported
   */
  public static create(config: AIServiceConfig): IAIService {
    switch (config.model) {
      case AIModel.GEMINI_2_5_FLASH:
        return new GeminiService(config);
      
      default:
        throw new Error(`Unsupported AI model: ${config.model}`);
    }
  }

  /**
   * Gets all available AI models
   * @returns Array of available AI models
   */
  public static getAvailableModels(): AIModel[] {
    return Object.values(AIModel);
  }

  /**
   * Checks if a model is supported
   * @param model The model to check
   * @returns True if the model is supported
   */
  public static isModelSupported(model: AIModel): boolean {
    return this.getAvailableModels().includes(model);
  }
}

