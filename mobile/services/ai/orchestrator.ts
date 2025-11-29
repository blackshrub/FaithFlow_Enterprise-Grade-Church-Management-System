/**
 * AI Orchestrator
 *
 * Unified AI engine for Faith Assistant.
 * Handles intent classification, model selection, streaming, and error recovery.
 *
 * Features:
 * - Intent-based model routing (Haiku/Sonnet/Opus)
 * - Dynamic temperature and token limits
 * - Context summarization for long conversations
 * - Bible verse detection and enhancement
 * - Suggested follow-up prompts
 * - Comprehensive error handling with retry
 * - Timeout protection
 */

import { classifyIntent, type Intent } from './intentClassifier';
import { getModelForIntent, getModelInfo } from './modelSelector';
import { getTemperature } from './temperature';
import { getMaxTokens } from './maxTokens';
import { optimizeContext, buildOptimizedMessages, type Message } from './contextSummarizer';
import { enhanceWithVerseContext, detectVerseReferences } from './verseEnhancer';
import { getSuggestedPrompts, getResponseBasedSuggestions, type SuggestedPrompt } from './suggestedPrompts';
import {
  detectPersona,
  buildPersonaToneInstruction,
  getPersonaTemperature,
  type UserPersona,
} from './persona';
import {
  classifyError,
  calculateRetryDelay,
  shouldRetry,
  TIMEOUT_CONFIG,
  DEFAULT_RETRY_CONFIG,
  type AIError,
  type RetryConfig,
} from './errorHandler';
import {
  createCacheableSystemPrompt,
  shouldUsePromptCache,
} from './promptCache';
import EventSource from 'react-native-sse';

export interface AIResponseChunk {
  type: 'text';
  content: string;
}

export interface SendAIOptions {
  systemPrompt: string;
  userInput: string;
  apiKey: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onStart?: () => void;
  onChunk?: (chunk: AIResponseChunk) => void;
  onComplete?: (fullText: string, metadata: AIResponseMetadata) => void;
  onError?: (error: AIError) => void;
  onIntentDetected?: (intent: Intent) => void;
  onRetry?: (attempt: number, delay: number) => void;
  retryConfig?: Partial<RetryConfig>;
  lang?: 'en' | 'id';
}

export interface AIResponseMetadata {
  intent: Intent;
  persona: UserPersona;
  model: string;
  modelTier: string;
  temperature: number;
  tokensUsed?: number;
  latencyMs: number;
  suggestedPrompts: SuggestedPrompt[];
  detectedVerses: string[];
  wasRetried: boolean;
  retryCount: number;
}

/**
 * Detect language for tone + Scripture selection (EN/ID)
 */
function detectLanguage(text: string): 'id' | 'en' {
  const indonesianKeywords = ['yang', 'tidak', 'apa', 'bagaimana', 'mengapa', 'gereja', 'saya', 'kamu', 'dan', 'untuk', 'dengan', 'ini', 'itu'];
  const count = indonesianKeywords.filter((w) =>
    text.toLowerCase().includes(w)
  ).length;

  return count >= 2 ? 'id' : 'en';
}

/**
 * Get timeout based on model tier
 */
function getTimeout(intent: Intent): number {
  switch (intent) {
    case 'simple':
      return TIMEOUT_CONFIG.simple;
    case 'scholarly':
    case 'apologetics':
      return TIMEOUT_CONFIG.complex;
    default:
      return TIMEOUT_CONFIG.standard;
  }
}

/**
 * Build dynamic context injection (lightweight, ~200-400 tokens)
 * Base prompt comes from caller; we only add session-specific context
 */
function buildDynamicContextInjection(
  intent: Intent,
  persona: UserPersona,
  personaTone: string,
  lang: 'id' | 'en',
  verseContext: string | null
): string {
  let context = `
═══════════════════════════════════════════════════════════════
CURRENT SESSION
═══════════════════════════════════════════════════════════════
Language: ${lang === 'id' ? 'Bahasa Indonesia' : 'English'}
Intent: ${intent}
User: ${persona}
${personaTone}`;

  if (verseContext) {
    context += `\n\n${verseContext}`;
  }

  return context.trim();
}

/**
 * Main AI Orchestrator Function
 * Returns cleanup function for SSE connection
 */
export function sendAIMessage({
  systemPrompt,
  userInput,
  apiKey,
  conversationHistory = [],
  onStart,
  onChunk,
  onComplete,
  onError,
  onIntentDetected,
  onRetry,
  retryConfig,
  lang: overrideLang,
}: SendAIOptions): () => void {
  const startTime = Date.now();
  let fullText = '';
  let retryCount = 0;
  let wasRetried = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let es: any = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isCancelled = false;

  const config: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

  // 1. Classify intent
  const intent = classifyIntent(userInput);
  onIntentDetected?.(intent);

  // 2. Detect user persona (age-based adaptation)
  const persona = detectPersona(userInput);

  // 3. Choose model dynamically
  const model = getModelForIntent(intent);
  const modelInfo = getModelInfo(model);

  // 4. Choose temperature dynamically (blend intent + persona)
  const intentTemperature = getTemperature(intent);
  const personaTemperature = getPersonaTemperature(persona);
  // Average the two temperatures for balanced adaptation
  const temperature = (intentTemperature + personaTemperature) / 2;

  // 5. Control output size for speed
  const max_tokens = getMaxTokens(intent);

  // 6. Detect language
  const lang = overrideLang || detectLanguage(userInput);

  // 7. Detect and enhance with verse context
  const verseContext = enhanceWithVerseContext(userInput, lang);
  const detectedVerses = detectVerseReferences(userInput).map(v => v.raw);

  // 8. Build dynamic context (lightweight injection onto base prompt)
  const personaTone = buildPersonaToneInstruction(persona);
  const dynamicContext = buildDynamicContextInjection(intent, persona, personaTone, lang, verseContext);
  const finalSystemPrompt = `${systemPrompt}\n\n${dynamicContext}`;

  // 9. Optimize conversation context
  const messages: Message[] = conversationHistory.map(m => ({
    role: m.role,
    content: m.content,
  }));
  const optimizedContext = optimizeContext(messages);
  const optimizedMessages = buildOptimizedMessages(optimizedContext);

  // Add current user message
  optimizedMessages.push({ role: 'user', content: userInput });

  // 10. Get timeout for this request
  const timeout = getTimeout(intent);

  // 11. Prepare system prompt with caching if beneficial
  const usePromptCache = shouldUsePromptCache(finalSystemPrompt);
  const systemPayload = usePromptCache
    ? createCacheableSystemPrompt(finalSystemPrompt)
    : finalSystemPrompt;

  console.log(`[AIOrchestrator] Intent: ${intent}, Persona: ${persona}, Model: ${modelInfo.name} (${modelInfo.tier}), Temp: ${temperature.toFixed(2)}, Lang: ${lang}, Cache: ${usePromptCache}, Timeout: ${timeout}ms`);

  /**
   * Execute the SSE request
   */
  function executeRequest(attempt: number = 0): void {
    if (isCancelled) return;

    // Clear previous timeout
    if (timeoutId) clearTimeout(timeoutId);

    // Set timeout
    timeoutId = setTimeout(() => {
      if (es) {
        es.close();
        es = null;
      }

      const timeoutError = classifyError(new Error(`Request timed out after ${timeout}ms`));
      timeoutError.type = 'timeout';

      if (shouldRetry(timeoutError, attempt, config)) {
        wasRetried = true;
        retryCount = attempt + 1;
        const delay = calculateRetryDelay(attempt, config);

        console.log(`[AIOrchestrator] Timeout, retrying (${retryCount}/${config.maxRetries}) after ${delay}ms`);
        onRetry?.(retryCount, delay);

        setTimeout(() => executeRequest(attempt + 1), delay);
      } else {
        onError?.(timeoutError);
      }
    }, timeout);

    onStart?.();

    // Reset fullText for retry
    if (attempt > 0) {
      fullText = '';
    }

    // Create SSE connection
    es = new EventSource('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens,
        temperature,
        stream: true,
        system: systemPayload,
        messages: optimizedMessages,
      }),
      pollingInterval: 0,
    });

    // Handle content_block_delta events (token streaming)
    es.addEventListener('content_block_delta', (event: any) => {
      if (isCancelled) return;

      // Clear timeout on first token - we're receiving data
      if (timeoutId && fullText.length === 0) {
        clearTimeout(timeoutId);
        // Set a longer timeout for streaming
        timeoutId = setTimeout(() => {
          console.warn('[AIOrchestrator] Stream stalled');
        }, 30000); // 30s stall detection
      }

      try {
        const data = JSON.parse(event.data);
        if (data.delta?.text) {
          const token = data.delta.text;
          fullText += token;
          onChunk?.({
            type: 'text',
            content: token,
          });
        }
      } catch {
        // Ignore parse errors
      }
    });

    // Handle message_stop event (completion)
    es.addEventListener('message_stop', () => {
      if (isCancelled) return;

      // Clear timeout
      if (timeoutId) clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      // Generate suggested follow-ups
      const suggestedPrompts = [
        ...getSuggestedPrompts(intent, userInput, lang, 2),
        ...getResponseBasedSuggestions(fullText, lang, 1),
      ].slice(0, 3);

      const metadata: AIResponseMetadata = {
        intent,
        persona,
        model,
        modelTier: modelInfo.tier,
        temperature,
        latencyMs,
        suggestedPrompts,
        detectedVerses,
        wasRetried,
        retryCount,
      };

      console.log(`[AIOrchestrator] Complete in ${latencyMs}ms, ${fullText.length} chars, Persona: ${persona}`);

      onComplete?.(fullText, metadata);
      es?.close();
    });

    // Handle errors
    es.addEventListener('error', (event: any) => {
      if (isCancelled) return;

      // Clear timeout
      if (timeoutId) clearTimeout(timeoutId);

      console.error('[AIOrchestrator] SSE error:', event);

      const error = classifyError(new Error(event.message || 'Streaming error'));

      // Check if we should retry
      if (shouldRetry(error, attempt, config)) {
        wasRetried = true;
        retryCount = attempt + 1;
        const delay = error.retryAfter || calculateRetryDelay(attempt, config);

        console.log(`[AIOrchestrator] Error, retrying (${retryCount}/${config.maxRetries}) after ${delay}ms`);
        onRetry?.(retryCount, delay);

        es?.close();
        setTimeout(() => executeRequest(attempt + 1), delay);
      } else {
        onError?.(error);
        es?.close();
      }
    });
  }

  // Start the request
  executeRequest(0);

  // Return cleanup function
  return () => {
    isCancelled = true;
    if (timeoutId) clearTimeout(timeoutId);
    if (es) {
      es.close();
      es = null;
    }
  };
}

// Re-export types and utilities
export { classifyIntent, type Intent } from './intentClassifier';
export { getModelForIntent, MODELS, getModelInfo } from './modelSelector';
export { getTemperature } from './temperature';
export { getMaxTokens } from './maxTokens';
export { getSuggestedPrompts, getResponseBasedSuggestions, type SuggestedPrompt } from './suggestedPrompts';
export { optimizeContext, analyzeConversation, type ConversationSummary } from './contextSummarizer';
export { detectVerseReferences, enhanceWithVerseContext, type VerseReference } from './verseEnhancer';
export {
  classifyError,
  getErrorMessage,
  type AIError,
  type AIErrorType,
} from './errorHandler';

export default sendAIMessage;
