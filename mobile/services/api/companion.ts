/**
 * Faith Assistant (Pendamping Iman) API Service
 *
 * Handles communication with the backend companion chat endpoint.
 */

import { apiClient } from './client';
import type { CompanionMessage, CompanionContext } from '@/stores/companionStore';

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

/**
 * Send a message to the Faith Assistant and get a response
 */
export async function sendCompanionMessage(request: ChatRequest): Promise<ChatResponse> {
  try {
    const response = await apiClient.post<ChatResponse>('/companion/chat', request);
    return response.data;
  } catch (error: any) {
    // If authenticated endpoint fails, try public endpoint
    if (error.response?.status === 401) {
      const publicResponse = await apiClient.post<ChatResponse>(
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
  const response = await apiClient.post<ChatResponse>('/companion/public/chat', request);
  return response.data;
}

export default {
  sendCompanionMessage,
  sendCompanionMessagePublic,
};
