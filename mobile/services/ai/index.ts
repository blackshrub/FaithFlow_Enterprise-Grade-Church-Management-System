/**
 * AI Services - Unified Export
 *
 * Complete AI engine for Faith Assistant with:
 * - Intent classification (simple, pastoral, scholarly, devotional, apologetics, crisis)
 * - Model selection (Haiku/Sonnet/Opus)
 * - Persona detection (child, teen, young_adult, adult, senior)
 * - Temperature and token optimization
 * - Context summarization
 * - Bible verse enhancement
 * - Suggested prompts
 * - Error handling with retry
 */

// Main orchestrator
export * from './orchestrator';
export { default as sendAIMessage } from './orchestrator';

// Intent classification
export * from './intentClassifier';
export { default as classifyIntent } from './intentClassifier';

// Model selection
export * from './modelSelector';
export { default as getModelForIntent } from './modelSelector';

// Temperature configuration
export * from './temperature';
export { default as getTemperature } from './temperature';

// Token limits
export * from './maxTokens';
export { default as getMaxTokens } from './maxTokens';

// Context building (basic)
export { buildContext } from './contextBuilder';
export { default as buildContextDefault } from './contextBuilder';

// Context summarization (advanced)
export {
  optimizeContext,
  buildOptimizedMessages,
  analyzeConversation,
  type Message,
  type ConversationSummary,
  type OptimizedContext,
} from './contextSummarizer';
export { default as optimizeContextDefault } from './contextSummarizer';

// Bible verse enhancement
export * from './verseEnhancer';
export { default as detectVerseReferences } from './verseEnhancer';

// Suggested prompts
export * from './suggestedPrompts';
export { default as getSuggestedPrompts } from './suggestedPrompts';

// Error handling
export * from './errorHandler';
export { default as classifyError } from './errorHandler';

// Persona detection (age-based adaptation)
export * from './persona';
export { default as detectPersona } from './persona';

// Parallel pre-generation (warm-up)
export * from './parallelPregeneration';
export { default as preGenerateHint } from './parallelPregeneration';

// Session memory (RAM-only, privacy-safe)
export {
  addUserMessage,
  addAssistantResponse,
  getConversationHistory,
  getRecentHistory,
  clearConversation,
  hasActiveConversation,
  getConversationLength,
  getSessionSummary,
  buildContextSummary,
  getLastUserMessage,
  getLastAssistantResponse,
  isFollowUpQuestion,
  SESSION_CONFIG,
  type ConversationTurn,
  type SessionSummary,
} from './sessionMemory';
export { default as sessionMemory } from './sessionMemory';

// Prompt caching (faster subsequent requests)
export {
  createCacheableSystemPrompt,
  shouldUsePromptCache,
  buildCachedRequestBody,
  parseCacheStats,
  logCachePerformance,
  type CacheableMessage,
  type CacheableContent,
  type CacheableSystemPrompt,
  type CacheStats,
} from './promptCache';
export { default as promptCache } from './promptCache';

// Connection warmup (faster first request)
export {
  warmupConnection,
  isConnectionWarm,
  resetWarmup,
  getWarmupTimeRemaining,
} from './connectionWarmup';
export { default as connectionWarmup } from './connectionWarmup';
