/**
 * Faith Assistant (Pendamping Iman) Store
 *
 * Manages chat state for the spiritual companion feature.
 * Session-based - no persistent history.
 */

import { create } from 'zustand';

export interface CompanionMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
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

export const useCompanionStore = create<CompanionState>((set, get) => ({
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
      timestamp: new Date(),
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
}));

export default useCompanionStore;
