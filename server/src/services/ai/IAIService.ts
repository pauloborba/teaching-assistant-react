import { AICorrectionRequest, AICorrectionResponse, AIServiceMetadata, AIModel } from '../../types/AIModel';

/**
 * Interface defining the contract for AI services
 * Follows Interface Segregation Principle - specific interface for AI operations
 */
export interface IAIService {
  /**
   * Gets metadata about the AI service
   */
  getMetadata(): AIServiceMetadata;

  /**
   * Corrects a student's answer using AI
   * @param request The correction request with question and answer data
   * @returns Promise resolving to the correction response
   */
  correctAnswer(request: AICorrectionRequest): Promise<AICorrectionResponse>;

  /**
   * Validates if the service is properly configured
   * @returns Promise resolving to true if service is ready
   */
  validateConfiguration(): Promise<boolean>;
}

