/**
 * Enumeration of available AI models
 */
export enum AIModel {
  GEMINI_2_5_FLASH = 'Gemini 2.5 Flash'
}

/**
 * Configuration for AI service initialization
 */
export interface AIServiceConfig {
  apiKey?: string;
  model: AIModel;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Request payload for AI correction
 */
export interface AICorrectionRequest {
  questionId: number;
  questionText: string;
  questionType: 'open' | 'closed';
  studentAnswer: string;
  correctAnswer: string;
  context?: string;
}

/**
 * Response from AI correction service
 */
export interface AICorrectionResponse {
  isCorrect: boolean;
  score: number; // 0-10
  feedback?: string;
  confidence?: number; // 0-1
}

/**
 * Metadata about the AI service
 */
export interface AIServiceMetadata {
  model: AIModel;
  name: string;
  version: string;
  capabilities: string[];
}

