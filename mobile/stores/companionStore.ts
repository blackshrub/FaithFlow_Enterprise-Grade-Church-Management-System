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
  addMessage: (message: Omit<CompanionMessage, 'id' | 'timestamp'>) => void;
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
    const newMessage: CompanionMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date(),
    };
    set((state) => ({
      messages: [...state.messages, newMessage],
      error: null,
    }));
  },

  setLoading: (loading) => {
    set({ isLoading: loading });
  },

  setError: (error) => {
    set({ error, isLoading: false });
  },

  clearChat: () => {
    set({
      messages: [],
      error: null,
      isLoading: false,
    });
  },

  resetSession: () => {
    set({
      messages: [],
      error: null,
      isLoading: false,
      entryContext: 'default',
      contextData: undefined,
    });
  },
}));

export default useCompanionStore;
