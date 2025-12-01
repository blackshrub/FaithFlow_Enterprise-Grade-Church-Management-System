/**
 * Faith Assistant (Pendamping Iman) Store
 *
 * Manages chat state for the spiritual companion feature.
 * With MMKV persistence for session recovery across app restarts.
 *
 * Persistence Strategy:
 * - Last 20 messages preserved for quick resume
 * - Session context preserved
 * - Clears on explicit resetSession() call
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';

// Max messages to persist (keep chat history manageable)
const MAX_PERSISTED_MESSAGES = 20;

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // Changed to string for JSON serialization
}

export type CompanionContext =
  | 'default'
  | 'fromVerse'
  | 'fromDevotion'
  | 'morning'
  | 'evening';

interface CompanionState {
  // Chat state
  messages: CompanionMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessageId: string | null;
  error: string | null;

  // Context for personalized greeting
  entryContext: CompanionContext;
  contextData?: {
    verseReference?: string;
    verseText?: string;
    devotionTitle?: string;
    devotionId?: string;
  };

  // Actions
  setEntryContext: (context: CompanionContext, data?: CompanionState['contextData']) => void;
  addMessage: (message: Omit<CompanionMessage, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, content: string) => void;
  startStreaming: (messageId: string) => void;
  stopStreaming: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearChat: () => void;
  resetSession: () => void;
}

/**
 * Generate unique ID for messages
 */
const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Determine greeting context based on time of day
 */
export const getTimeBasedContext = (): CompanionContext => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 18 || hour < 5) return 'evening';
  return 'default';
};

export const useCompanionStore = create<CompanionState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      isStreaming: false,
      streamingMessageId: null,
      error: null,
      entryContext: 'default',
      contextData: undefined,

      setEntryContext: (context, data) => {
        set({
          entryContext: context,
          contextData: data,
        });
      },

      addMessage: (message) => {
        const id = generateId();
        const newMessage: CompanionMessage = {
          ...message,
          id,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, newMessage],
          error: null,
        }));
        return id;
      },

      updateMessage: (id, content) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, content } : msg
          ),
        }));
      },

      startStreaming: (messageId) => {
        set({
          isStreaming: true,
          streamingMessageId: messageId,
          isLoading: false,
        });
      },

      stopStreaming: () => {
        set({
          isStreaming: false,
          streamingMessageId: null,
        });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error, isLoading: false, isStreaming: false, streamingMessageId: null });
      },

      clearChat: () => {
        set({
          messages: [],
          error: null,
          isLoading: false,
          isStreaming: false,
          streamingMessageId: null,
        });
      },

      resetSession: () => {
        set({
          messages: [],
          error: null,
          isLoading: false,
          isStreaming: false,
          streamingMessageId: null,
          entryContext: 'default',
          contextData: undefined,
        });
      },
    }),
    {
      name: 'faithflow-companion',
      storage: createJSONStorage(() => mmkvStorage),
      // Persist messages and context, not UI state
      partialize: (state) => ({
        // Keep only last N messages
        messages: state.messages.slice(-MAX_PERSISTED_MESSAGES),
        entryContext: state.entryContext,
        contextData: state.contextData,
      }),
    }
  )
);

export default useCompanionStore;
