/**
 * AI Service Module
 * 
 * This module provides a clean, extensible architecture for AI integration
 * following SOLID principles and best practices.
 * 
 * Architecture:
 * - IAIService: Interface defining the contract
 * - AIService: Abstract base class with common functionality
 * - GeminiService: Concrete implementation for Gemini 2.5 Flash
 * - AIServiceFactory: Factory for creating service instances
 */

export { IAIService } from './IAIService';
export { AIService } from './AIService';
export { GeminiService } from './GeminiService';
export { AIServiceFactory } from './AIServiceFactory';
export * from '../../types/AIModel';

