/**
 * Context Summarizer
 *
 * Manages conversation context to optimize token usage.
 * Summarizes older messages while keeping recent ones intact.
 *
 * Strategy:
 * - Keep last N messages in full (recent context)
 * - Summarize older messages into a compact form
 * - Track key topics and prayer requests mentioned
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationSummary {
  topics: string[];
  prayerRequests: string[];
  keyPoints: string[];
  emotionalTone: 'positive' | 'neutral' | 'struggling' | 'crisis';
  messageCount: number;
}

export interface OptimizedContext {
  summary: string | null;
  recentMessages: Message[];
  totalTokensEstimate: number;
}

// Configuration
const CONFIG = {
  // Keep this many recent messages in full
  RECENT_MESSAGE_COUNT: 6,
  // Maximum characters before triggering summarization
  MAX_CONTEXT_CHARS: 8000,
  // Approximate tokens per character
  CHARS_PER_TOKEN: 4,
};

/**
 * Estimate token count from text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CONFIG.CHARS_PER_TOKEN);
}

/**
 * Extract topics from messages
 */
function extractTopics(messages: Message[]): string[] {
  const topics = new Set<string>();
  const topicPatterns: Record<string, RegExp> = {
    'prayer': /pray|doa|berdoa/i,
    'anxiety': /anxious|anxiety|worried|cemas|khawatir/i,
    'relationship': /marriage|relationship|family|pernikahan|hubungan|keluarga/i,
    'faith doubt': /doubt|unsure|question.*faith|ragu|tidak yakin/i,
    'Bible study': /bible|scripture|verse|alkitab|firman|ayat/i,
    'salvation': /saved|salvation|grace|selamat|keselamatan|anugerah/i,
    'suffering': /suffer|pain|hurt|why god|menderita|sakit|mengapa tuhan/i,
    'guidance': /guidance|direction|decision|bimbingan|arahan|keputusan/i,
    'forgiveness': /forgive|guilt|shame|mengampuni|bersalah|malu/i,
    'gratitude': /thankful|grateful|blessed|bersyukur|berkat/i,
  };

  const fullText = messages.map(m => m.content).join(' ');

  for (const [topic, pattern] of Object.entries(topicPatterns)) {
    if (pattern.test(fullText)) {
      topics.add(topic);
    }
  }

  return Array.from(topics);
}

/**
 * Extract prayer requests from messages
 */
function extractPrayerRequests(messages: Message[]): string[] {
  const requests: string[] = [];
  const prayerPatterns = [
    /pray for (.+?)(?:\.|,|$)/gi,
    /need prayer (?:for |about )?(.+?)(?:\.|,|$)/gi,
    /doakan (.+?)(?:\.|,|$)/gi,
    /minta doa (?:untuk )?(.+?)(?:\.|,|$)/gi,
  ];

  for (const message of messages) {
    if (message.role !== 'user') continue;

    for (const pattern of prayerPatterns) {
      const matches = message.content.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length < 100) {
          requests.push(match[1].trim());
        }
      }
    }
  }

  return [...new Set(requests)].slice(0, 5); // Max 5 prayer requests
}

/**
 * Detect emotional tone of conversation
 */
function detectEmotionalTone(messages: Message[]): ConversationSummary['emotionalTone'] {
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');

  // Crisis indicators (highest priority)
  if (/suicide|kill myself|want to die|bunuh diri|ingin mati/i.test(userMessages)) {
    return 'crisis';
  }

  // Struggling indicators
  const strugglingKeywords = [
    'struggling', 'depressed', 'anxious', 'hopeless', 'lost', 'broken',
    'berjuang', 'depresi', 'cemas', 'putus asa', 'hancur',
  ];
  const strugglingCount = strugglingKeywords.filter(kw => userMessages.includes(kw)).length;
  if (strugglingCount >= 2) return 'struggling';

  // Positive indicators
  const positiveKeywords = [
    'thankful', 'grateful', 'blessed', 'happy', 'joy', 'peace',
    'bersyukur', 'bahagia', 'sukacita', 'damai',
  ];
  const positiveCount = positiveKeywords.filter(kw => userMessages.includes(kw)).length;
  if (positiveCount >= 2) return 'positive';

  return 'neutral';
}

/**
 * Generate a concise summary of older messages
 */
function generateSummary(messages: Message[]): string {
  const topics = extractTopics(messages);
  const prayerRequests = extractPrayerRequests(messages);
  const tone = detectEmotionalTone(messages);

  const parts: string[] = [];

  // Conversation overview
  parts.push(`[Previous conversation: ${messages.length} messages]`);

  // Topics discussed
  if (topics.length > 0) {
    parts.push(`Topics: ${topics.join(', ')}`);
  }

  // Prayer requests
  if (prayerRequests.length > 0) {
    parts.push(`Prayer needs: ${prayerRequests.join('; ')}`);
  }

  // Emotional context
  if (tone !== 'neutral') {
    const toneDescriptions = {
      positive: 'User expressing gratitude/joy',
      struggling: 'User going through difficulties',
      crisis: 'CRISIS DETECTED - prioritize safety',
    };
    parts.push(toneDescriptions[tone]);
  }

  return parts.join('\n');
}

/**
 * Optimize conversation context for API call
 *
 * @param messages Full conversation history
 * @returns Optimized context with summary and recent messages
 */
export function optimizeContext(messages: Message[]): OptimizedContext {
  // If conversation is short, return as-is
  if (messages.length <= CONFIG.RECENT_MESSAGE_COUNT) {
    return {
      summary: null,
      recentMessages: messages,
      totalTokensEstimate: estimateTokens(messages.map(m => m.content).join('')),
    };
  }

  // Check total context size
  const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);

  if (totalChars <= CONFIG.MAX_CONTEXT_CHARS) {
    return {
      summary: null,
      recentMessages: messages,
      totalTokensEstimate: estimateTokens(totalChars.toString()),
    };
  }

  // Split into old and recent messages
  const splitIndex = messages.length - CONFIG.RECENT_MESSAGE_COUNT;
  const oldMessages = messages.slice(0, splitIndex);
  const recentMessages = messages.slice(splitIndex);

  // Generate summary of old messages
  const summary = generateSummary(oldMessages);

  return {
    summary,
    recentMessages,
    totalTokensEstimate: estimateTokens(summary + recentMessages.map(m => m.content).join('')),
  };
}

/**
 * Build messages array with optional summary prefix
 */
export function buildOptimizedMessages(
  optimizedContext: OptimizedContext
): Message[] {
  const messages: Message[] = [];

  // Add summary as a system context note if present
  if (optimizedContext.summary) {
    messages.push({
      role: 'user',
      content: `[Context from earlier conversation:\n${optimizedContext.summary}]\n\nContinuing our conversation:`,
    });
    messages.push({
      role: 'assistant',
      content: 'I remember our conversation. Please continue.',
    });
  }

  // Add recent messages
  messages.push(...optimizedContext.recentMessages);

  return messages;
}

/**
 * Analyze conversation for insights
 */
export function analyzeConversation(messages: Message[]): ConversationSummary {
  return {
    topics: extractTopics(messages),
    prayerRequests: extractPrayerRequests(messages),
    keyPoints: [], // Could be enhanced with AI-powered extraction
    emotionalTone: detectEmotionalTone(messages),
    messageCount: messages.length,
  };
}

export default optimizeContext;
