/**
 * Faith Assistant (Pendamping Iman) API Service
 *
 * Handles communication with the backend companion chat endpoint.
 * Uses backend streaming API for secure AI processing.
 */

import { api } from '../api';
import type { CompanionContext } from '@/stores/companionStore';
import { SPIRITUAL_COMPANION_SYSTEM_PROMPT } from '@/constants/companionPrompt';
import {
  type AIResponseMetadata,
  type SuggestedPrompt,
  addUserMessage,
  addAssistantResponse,
  clearConversation as clearSessionMemory,
  hasActiveConversation,
  getConversationLength,
  buildContextSummary,
} from '@/services/ai';
import type { AIError } from '@/services/ai/errorHandler';
import type { Intent } from '@/services/ai/intentClassifier';

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
    // New contextual companion fields (Feature 4)
    studyId?: string;
    studyTitle?: string;
    lessonNumber?: number;
    lessonTitle?: string;
    journeySlug?: string;
    journeyTitle?: string;
    weekNumber?: number;
    dayNumber?: number;
    quizId?: string;
    quizTitle?: string;
    questionIndex?: number;
    // Custom system prompt from backend (Feature 4 - Contextual Companion)
    systemPrompt?: string;
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
 *
 * If contextData.systemPrompt is provided (from backend contextual companion API),
 * use that instead of the default prompt. This allows the backend to provide
 * context-bounded prompts for devotions, journeys, quizzes, etc.
 */
function buildSystemPrompt(context?: CompanionContext, contextData?: ChatRequest['context_data']): string {
  // Feature 4: If backend provided a custom system prompt, use it directly
  // This is for contextual companion mode (devotion, journey, quiz, etc.)
  if (contextData?.systemPrompt) {
    return contextData.systemPrompt;
  }

  // Default: Build prompt from template
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
 * Send message with streaming via Backend API
 *
 * Uses the backend's /api/explore/companion/chat/stream endpoint
 * which handles the Anthropic API call server-side with proper authentication.
 *
 * Features:
 * - Server-side AI processing (secure API key handling)
 * - SSE streaming for real-time response
 * - Context-aware responses
 * - Error handling
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

  let fullText = '';
  // react-native-sse has different API than browser EventSource - use any for compatibility
  let eventSource: any = null;
  let isCancelled = false;

  // Track user message in session memory
  addUserMessage(latestUserMessage);

  // Add context summary if resuming conversation
  const contextSummary = buildContextSummary();
  const enhancedSystemPrompt = contextSummary
    ? `${systemPrompt}\n\n${contextSummary}`
    : systemPrompt;

  console.log(`[Faith Assistant] Using Backend API | Session: ${getConversationLength()} turns | Active: ${hasActiveConversation()}`);

  // Use backend streaming endpoint
  const startStream = async () => {
    try {
      // Get auth token
      const SecureStore = await import('expo-secure-store');
      const token = await SecureStore.getItemAsync('auth_token');

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Import API base URL
      const { API_BASE_URL } = await import('@/constants/api');

      callbacks.onStart?.();

      // Use react-native-sse for SSE streaming
      const EventSourceModule = await import('react-native-sse');
      const EventSourceClass = EventSourceModule.default;

      // Prepare request body - matches CompanionChatRequest in backend
      const body = {
        messages: request.messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        context: request.context || null,
        context_data: request.context_data || null,
      };

      eventSource = new EventSourceClass(
        `${API_BASE_URL}/api/companion/chat/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
          pollingInterval: 0,
        }
      );

      // Handle SSE events
      eventSource.addEventListener('message', (event: any) => {
        if (isCancelled) return;

        try {
          const data = JSON.parse(event.data);

          if (data.type === 'text' && data.text) {
            fullText += data.text;
            callbacks.onToken?.(data.text, fullText);
          } else if (data.type === 'done') {
            // Track assistant response in session memory
            addAssistantResponse(fullText);

            // Create minimal metadata for compatibility
            const metadata: AIResponseMetadata = {
              intent: 'general_faith',
              persona: 'adult',
              model: 'claude-sonnet-4-5-20250929',
              modelTier: 'balanced',
              temperature: 0.4,
              latencyMs: 0,
              suggestedPrompts: [],
              detectedVerses: [],
              wasRetried: false,
              retryCount: 0,
            };

            callbacks.onComplete?.(fullText, metadata);
            eventSource?.close();
          } else if (data.type === 'error') {
            throw new Error(data.error || 'Stream error');
          }
        } catch (parseError) {
          // Ignore parse errors for malformed chunks
          console.warn('[Faith Assistant] Parse error:', parseError);
        }
      });

      eventSource.addEventListener('error', (event: any) => {
        if (isCancelled) return;

        console.error('[Faith Assistant] SSE error:', event);
        const error: AIError = {
          type: 'network',
          message: event.message || 'Stream connection error',
          messageId: 'ai.error.stream',
          retryable: true,
          originalError: new Error(event.message || 'Stream error'),
        };
        callbacks.onError?.(error);
        eventSource?.close();
      });
    } catch (error: any) {
      console.error('[Faith Assistant] Stream setup error:', error);
      const aiError: AIError = {
        type: 'network',
        message: error.message || 'Failed to connect to server',
        messageId: 'ai.error.network',
        retryable: true,
        originalError: error,
      };
      callbacks.onError?.(aiError);
    }
  };

  // Start the stream
  startStream();

  // Return cleanup function
  return () => {
    isCancelled = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
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
 * Send a message to the Faith Assistant and get a response (non-streaming)
 */
export async function sendCompanionMessage(request: ChatRequest): Promise<ChatResponse> {
  // Always use backend API
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
