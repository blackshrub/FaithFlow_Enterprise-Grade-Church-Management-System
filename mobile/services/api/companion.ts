/**
 * Faith Assistant (Pendamping Iman) API Service
 *
 * Handles communication with the backend companion chat endpoint.
 * Uses AIOrchestrator for intelligent intent-based model routing.
 */

import { api } from '../api';
import type { CompanionContext } from '@/stores/companionStore';
import { SPIRITUAL_COMPANION_SYSTEM_PROMPT } from '@/constants/companionPrompt';
import {
  sendAIMessage,
  type Intent,
  type AIError,
  type AIResponseMetadata,
  type SuggestedPrompt,
  addUserMessage,
  addAssistantResponse,
  clearConversation as clearSessionMemory,
  hasActiveConversation,
  getConversationLength,
  buildContextSummary,
} from '@/services/ai';
import { DEV_ANTHROPIC_API_KEY } from '@/constants/secrets';

// Development mode configuration
const DEV_MODE = __DEV__;
const DEV_API_KEY = DEV_ANTHROPIC_API_KEY || '';

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  context?: CompanionContext;
  context_data?: {
    verseReference?: string;
    verseText?: string;
    devotionTitle?: string;
    devotionId?: string;
  };
}

export interface ChatResponse {
  message: string;
  timestamp: string;
}

export interface StreamCallbacks {
  onStart?: () => void;
  onToken?: (token: string, fullText: string) => void;
  onComplete?: (fullText: string, metadata?: AIResponseMetadata) => void;
  onError?: (error: Error | AIError) => void;
  onIntentDetected?: (intent: Intent) => void;
  onRetry?: (attempt: number, delay: number) => void;
  onSuggestedPrompts?: (prompts: SuggestedPrompt[]) => void;
}

/**
 * Build system prompt with context additions
 * Context-aware prompting for more empathetic and relevant responses
 */
function buildSystemPrompt(context?: CompanionContext, contextData?: ChatRequest['context_data']): string {
  let systemPrompt = SPIRITUAL_COMPANION_SYSTEM_PROMPT;

  // Add response style guidelines
  systemPrompt += `

RESPONSE STYLE:
- Begin responses with warmth and acknowledgment of the user's feelings when appropriate
- Use a conversational, gentle tone that feels like talking to a caring friend
- Keep initial responses concise (2-4 paragraphs) unless the user asks for more detail
- Use Scripture thoughtfully, not excessively - quality over quantity
- Ask clarifying questions when needed to better understand and help
- End responses with an invitation to continue the conversation or a thoughtful question`;

  if (context) {
    const contextAdditions: Record<string, string> = {
      morning: `

CONTEXT: Morning greeting
The user is starting their day. Be warm and encouraging. Help them prepare spiritually for the day ahead. Consider mentioning gratitude for a new day or asking about their intentions for the day.`,
      evening: `

CONTEXT: Evening reflection
The user is winding down their day. Be gentle and reflective. Help them process their day and find peace. Consider asking about their day or offering a calming Scripture for rest.`,
      fromVerse: `

CONTEXT: Coming from Bible reading
The user just read Scripture (${contextData?.verseReference || 'a Bible passage'}). They may want to explore its meaning, apply it to their life, or discuss how it made them feel. Start by acknowledging their time in God's Word.`,
      fromDevotion: `

CONTEXT: Coming from devotional
The user just finished a devotion${contextData?.devotionTitle ? `: "${contextData.devotionTitle}"` : ''}. They may want to reflect on what they learned, ask questions, or share how it impacted them. Be attentive to any spiritual insights they want to explore.`,
    };

    if (contextAdditions[context]) {
      systemPrompt += contextAdditions[context];
    }
  }

  return systemPrompt;
}

/**
 * Send message with streaming using AIOrchestrator
 * Intelligent intent-based model routing and temperature adjustment
 *
 * Features:
 * - Intent-based model selection (Haiku/Sonnet/Opus)
 * - Dynamic temperature and token limits
 * - Context summarization for long conversations
 * - Bible verse detection and enhancement
 * - Suggested follow-up prompts
 * - Comprehensive error handling with retry
 * - Timeout protection
 */
export function sendCompanionMessageStream(
  request: ChatRequest,
  callbacks: StreamCallbacks
): () => void {
  const systemPrompt = buildSystemPrompt(request.context, request.context_data);

  // Get the latest user message
  const latestUserMessage = request.messages
    .filter(m => m.role === 'user')
    .pop()?.content || '';

  // Get conversation history (excluding the latest message)
  const history = request.messages.slice(0, -1);

  let fullText = '';

  // Track user message in session memory
  addUserMessage(latestUserMessage);

  // Add context summary if resuming conversation
  const contextSummary = buildContextSummary();
  const enhancedSystemPrompt = contextSummary
    ? `${systemPrompt}\n\n${contextSummary}`
    : systemPrompt;

  console.log(`[Faith Assistant] Using AIOrchestrator | Session: ${getConversationLength()} turns | Active: ${hasActiveConversation()}`);

  // Use the AIOrchestrator with all advanced features
  return sendAIMessage({
    systemPrompt: enhancedSystemPrompt,
    userInput: latestUserMessage,
    apiKey: DEV_API_KEY,
    conversationHistory: history,
    onStart: callbacks.onStart,
    onChunk: (chunk) => {
      fullText += chunk.content;
      callbacks.onToken?.(chunk.content, fullText);
    },
    onComplete: (text, metadata) => {
      // Track assistant response in session memory
      addAssistantResponse(text);

      // Notify about suggested prompts if callback provided
      if (callbacks.onSuggestedPrompts && metadata.suggestedPrompts.length > 0) {
        callbacks.onSuggestedPrompts(metadata.suggestedPrompts);
      }
      callbacks.onComplete?.(text, metadata);
    },
    onError: callbacks.onError,
    onIntentDetected: callbacks.onIntentDetected,
    onRetry: callbacks.onRetry,
  });
}

/**
 * Clear conversation history (New Conversation)
 * Call this when user starts a new conversation
 */
export function clearConversation(): void {
  clearSessionMemory();
  console.log('[Faith Assistant] Conversation cleared - starting fresh');
}

/**
 * Check if there's an active conversation
 */
export function hasConversation(): boolean {
  return hasActiveConversation();
}

/**
 * Get current conversation length
 */
export function getConversationTurnCount(): number {
  return getConversationLength();
}

/**
 * Send message directly to Anthropic API (development mode) - non-streaming
 */
async function sendDirectToAnthropic(request: ChatRequest): Promise<ChatResponse> {
  const systemPrompt = buildSystemPrompt(request.context, request.context_data);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': DEV_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      temperature: 0.4,
      system: systemPrompt,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    message: data.content[0]?.text || 'No response received',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Send a message to the Faith Assistant and get a response
 */
export async function sendCompanionMessage(request: ChatRequest): Promise<ChatResponse> {
  // Use direct Anthropic API in development mode
  if (DEV_MODE) {
    console.log('[Faith Assistant] Using direct Anthropic API (dev mode)');
    return sendDirectToAnthropic(request);
  }

  // Production: use backend API
  try {
    const response = await api.post<ChatResponse>('/companion/chat', request);
    return response.data;
  } catch (error: any) {
    // If authenticated endpoint fails, try public endpoint
    if (error.response?.status === 401) {
      const publicResponse = await api.post<ChatResponse>(
        '/companion/public/chat',
        request
      );
      return publicResponse.data;
    }
    throw error;
  }
}

/**
 * Send message using public endpoint (no auth required)
 */
export async function sendCompanionMessagePublic(request: ChatRequest): Promise<ChatResponse> {
  // Use direct Anthropic API in development mode
  if (DEV_MODE) {
    console.log('[Faith Assistant] Using direct Anthropic API (dev mode)');
    return sendDirectToAnthropic(request);
  }

  const response = await api.post<ChatResponse>('/companion/public/chat', request);
  return response.data;
}

export default {
  sendCompanionMessage,
  sendCompanionMessagePublic,
  sendCompanionMessageStream,
  clearConversation,
  hasConversation,
  getConversationTurnCount,
};
