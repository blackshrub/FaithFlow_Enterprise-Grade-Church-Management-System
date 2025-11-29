/**
 * Session Memory
 *
 * In-memory conversation storage for Faith Assistant.
 * Memory is automatically cleared when app closes (RAM only, no persistence).
 *
 * Features:
 * - Store last N conversation turns
 * - Extract conversation topics for context
 * - Easy clear function for "New Conversation"
 * - Privacy-safe: nothing persisted to disk
 */

export interface ConversationTurn {
  user: string;
  assistant: string | null;
  timestamp: number;
  intent?: string;
  persona?: string;
}

export interface SessionSummary {
  topics: string[];
  messageCount: number;
  startedAt: number;
  lastActivityAt: number;
}

// Configuration
const CONFIG = {
  // Maximum conversation turns to keep in memory
  MAX_TURNS: 10,
  // Auto-clear after this many minutes of inactivity (0 = never)
  AUTO_CLEAR_MINUTES: 0,
};

// In-memory storage (cleared on app close)
let conversationHistory: ConversationTurn[] = [];
let sessionStartTime: number | null = null;

/**
 * Add a user message to the conversation
 */
export function addUserMessage(
  message: string,
  metadata?: { intent?: string; persona?: string }
): void {
  // Initialize session if needed
  if (sessionStartTime === null) {
    sessionStartTime = Date.now();
  }

  // Add new turn
  conversationHistory.push({
    user: message,
    assistant: null,
    timestamp: Date.now(),
    intent: metadata?.intent,
    persona: metadata?.persona,
  });

  // Trim to max size
  if (conversationHistory.length > CONFIG.MAX_TURNS) {
    conversationHistory = conversationHistory.slice(-CONFIG.MAX_TURNS);
  }
}

/**
 * Add assistant response to the last turn
 */
export function addAssistantResponse(response: string): void {
  if (conversationHistory.length > 0) {
    conversationHistory[conversationHistory.length - 1].assistant = response;
  }
}

/**
 * Get conversation history for API context
 * Returns array of { role, content } messages
 */
export function getConversationHistory(): Array<{ role: 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  for (const turn of conversationHistory) {
    messages.push({ role: 'user', content: turn.user });
    if (turn.assistant) {
      messages.push({ role: 'assistant', content: turn.assistant });
    }
  }

  return messages;
}

/**
 * Get the last N turns of conversation
 */
export function getRecentHistory(limit: number = 4): ConversationTurn[] {
  return conversationHistory.slice(-limit);
}

/**
 * Clear all conversation history (New Conversation)
 */
export function clearConversation(): void {
  conversationHistory = [];
  sessionStartTime = null;
  console.log('[SessionMemory] Conversation cleared');
}

/**
 * Check if there's an active conversation
 */
export function hasActiveConversation(): boolean {
  return conversationHistory.length > 0;
}

/**
 * Get conversation turn count
 */
export function getConversationLength(): number {
  return conversationHistory.length;
}

/**
 * Get session summary
 */
export function getSessionSummary(): SessionSummary | null {
  if (conversationHistory.length === 0) {
    return null;
  }

  // Extract topics from conversation
  const topics = extractTopics();

  return {
    topics,
    messageCount: conversationHistory.length,
    startedAt: sessionStartTime || Date.now(),
    lastActivityAt: conversationHistory[conversationHistory.length - 1]?.timestamp || Date.now(),
  };
}

/**
 * Extract topics from conversation for context
 */
function extractTopics(): string[] {
  const topics = new Set<string>();
  const topicKeywords: Record<string, string[]> = {
    'prayer': ['pray', 'prayer', 'doa', 'berdoa'],
    'anxiety': ['anxious', 'anxiety', 'worried', 'cemas', 'khawatir'],
    'faith': ['faith', 'believe', 'trust', 'iman', 'percaya'],
    'salvation': ['saved', 'salvation', 'grace', 'selamat', 'keselamatan'],
    'relationships': ['marriage', 'relationship', 'family', 'pernikahan', 'hubungan'],
    'suffering': ['suffer', 'pain', 'why god', 'menderita', 'mengapa tuhan'],
    'bible study': ['bible', 'scripture', 'verse', 'alkitab', 'ayat'],
    'guidance': ['guidance', 'direction', 'decision', 'bimbingan', 'keputusan'],
  };

  const allText = conversationHistory
    .map(t => t.user.toLowerCase())
    .join(' ');

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => allText.includes(kw))) {
      topics.add(topic);
    }
  }

  return Array.from(topics);
}

/**
 * Build context summary for AI (when resuming conversation)
 */
export function buildContextSummary(): string | null {
  const summary = getSessionSummary();
  if (!summary || summary.messageCount < 2) {
    return null;
  }

  const topicsStr = summary.topics.length > 0
    ? `Topics discussed: ${summary.topics.join(', ')}`
    : '';

  return `[Previous conversation: ${summary.messageCount} messages. ${topicsStr}]`.trim();
}

/**
 * Get the last user message (for detecting follow-ups)
 */
export function getLastUserMessage(): string | null {
  if (conversationHistory.length === 0) return null;
  return conversationHistory[conversationHistory.length - 1].user;
}

/**
 * Get the last assistant response
 */
export function getLastAssistantResponse(): string | null {
  if (conversationHistory.length === 0) return null;
  return conversationHistory[conversationHistory.length - 1].assistant;
}

/**
 * Check if current message is a follow-up question
 */
export function isFollowUpQuestion(currentMessage: string): boolean {
  if (conversationHistory.length === 0) return false;

  const followUpPatterns = [
    /^(what|why|how|can you|could you|tell me more|explain)/i,
    /^(apa|mengapa|bagaimana|bisakah|jelaskan|ceritakan)/i,
    /\?$/,
    /^(yes|no|ok|thanks|ya|tidak|oke|terima kasih)/i,
  ];

  // Short messages after a conversation are likely follow-ups
  if (currentMessage.length < 50 && conversationHistory.length > 0) {
    return true;
  }

  return followUpPatterns.some(pattern => pattern.test(currentMessage.trim()));
}

// Export configuration for customization
export { CONFIG as SESSION_CONFIG };

export default {
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
};
