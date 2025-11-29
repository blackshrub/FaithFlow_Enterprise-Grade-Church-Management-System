/**
 * Suggested Follow-up Prompts
 *
 * Generates contextual follow-up suggestions based on intent and conversation.
 * Helps users explore topics deeper and discover new areas of faith.
 */

import type { Intent } from './intentClassifier';

export interface SuggestedPrompt {
  text: string;
  textId: string; // Indonesian translation
  icon: string;
}

/**
 * Intent-specific follow-up suggestions
 */
const INTENT_SUGGESTIONS: Record<Intent, SuggestedPrompt[]> = {
  simple: [
    { text: 'Tell me a Bible verse for today', textId: 'Berikan ayat Alkitab untuk hari ini', icon: '📖' },
    { text: 'I need prayer for something', textId: 'Saya butuh doa untuk sesuatu', icon: '🙏' },
    { text: 'What should I read in the Bible?', textId: 'Apa yang harus saya baca di Alkitab?', icon: '📚' },
  ],
  pastoral: [
    { text: 'Can you pray with me about this?', textId: 'Bisakah kamu berdoa bersamaku?', icon: '🙏' },
    { text: 'What does Scripture say about this?', textId: 'Apa kata Alkitab tentang ini?', icon: '📖' },
    { text: 'How can I find peace in this?', textId: 'Bagaimana saya bisa menemukan damai?', icon: '☮️' },
    { text: 'Is there a story in the Bible like this?', textId: 'Apakah ada kisah seperti ini di Alkitab?', icon: '📚' },
  ],
  scholarly: [
    { text: 'What does the original Greek/Hebrew say?', textId: 'Apa kata bahasa Yunani/Ibrani aslinya?', icon: '🔤' },
    { text: 'How did early church fathers interpret this?', textId: 'Bagaimana bapa gereja menafsirkan ini?', icon: '📜' },
    { text: 'Compare with other translations', textId: 'Bandingkan dengan terjemahan lain', icon: '📊' },
    { text: 'What is the historical context?', textId: 'Apa konteks historisnya?', icon: '🏛️' },
  ],
  devotional: [
    { text: 'Give me a prayer based on this', textId: 'Berikan doa berdasarkan ini', icon: '🙏' },
    { text: 'How can I apply this today?', textId: 'Bagaimana menerapkan ini hari ini?', icon: '✨' },
    { text: 'Share a related verse', textId: 'Bagikan ayat yang terkait', icon: '📖' },
    { text: 'What should I meditate on?', textId: 'Apa yang harus saya renungkan?', icon: '🧘' },
  ],
  apologetics: [
    { text: 'What evidence supports this?', textId: 'Bukti apa yang mendukung ini?', icon: '🔍' },
    { text: 'How would you respond to critics?', textId: 'Bagaimana menanggapi kritik?', icon: '💬' },
    { text: 'Are there scholarly sources?', textId: 'Apakah ada sumber ilmiah?', icon: '📚' },
    { text: 'Explain the logic behind this', textId: 'Jelaskan logika di balik ini', icon: '🧠' },
  ],
  other_religions: [
    { text: 'What makes Christianity unique here?', textId: 'Apa yang membuat Kristen unik?', icon: '✝️' },
    { text: 'How can I share my faith respectfully?', textId: 'Bagaimana membagikan iman dengan hormat?', icon: '🤝' },
    { text: 'What does the Bible say about this?', textId: 'Apa kata Alkitab tentang ini?', icon: '📖' },
  ],
  general_faith: [
    { text: 'Can you explain more?', textId: 'Bisakah jelaskan lebih lanjut?', icon: '💡' },
    { text: 'What Bible verses relate to this?', textId: 'Ayat apa yang terkait dengan ini?', icon: '📖' },
    { text: 'How can I grow in this area?', textId: 'Bagaimana saya bisa bertumbuh?', icon: '🌱' },
    { text: 'Can you pray for me?', textId: 'Bisakah kamu mendoakan saya?', icon: '🙏' },
  ],
  crisis: [
    { text: 'I need to talk more about this', textId: 'Saya perlu berbicara lebih lanjut', icon: '💬' },
    { text: 'Can you pray for me right now?', textId: 'Bisakah doakan saya sekarang?', icon: '🙏' },
    { text: 'What resources can help me?', textId: 'Sumber apa yang bisa membantu?', icon: '🆘' },
  ],
};

/**
 * Topic-based follow-up suggestions
 */
const TOPIC_SUGGESTIONS: Record<string, SuggestedPrompt[]> = {
  prayer: [
    { text: 'Teach me how to pray better', textId: 'Ajari saya berdoa lebih baik', icon: '🙏' },
    { text: 'What is the Lord\'s Prayer about?', textId: 'Apa makna Doa Bapa Kami?', icon: '📖' },
  ],
  salvation: [
    { text: 'How can I be sure I\'m saved?', textId: 'Bagaimana saya yakin diselamatkan?', icon: '✝️' },
    { text: 'What does grace mean?', textId: 'Apa arti kasih karunia?', icon: '💝' },
  ],
  suffering: [
    { text: 'Why does God allow suffering?', textId: 'Mengapa Tuhan mengizinkan penderitaan?', icon: '❓' },
    { text: 'How did Jesus handle suffering?', textId: 'Bagaimana Yesus menghadapi penderitaan?', icon: '✝️' },
  ],
  faith: [
    { text: 'How can I strengthen my faith?', textId: 'Bagaimana menguatkan iman saya?', icon: '💪' },
    { text: 'What is faith according to the Bible?', textId: 'Apa itu iman menurut Alkitab?', icon: '📖' },
  ],
};

/**
 * Detect topics in user message
 */
function detectTopics(text: string): string[] {
  const topics: string[] = [];
  const lowerText = text.toLowerCase();

  const topicKeywords: Record<string, string[]> = {
    prayer: ['pray', 'prayer', 'berdoa', 'doa'],
    salvation: ['saved', 'salvation', 'selamat', 'keselamatan', 'born again'],
    suffering: ['suffer', 'pain', 'hurt', 'why god', 'menderita', 'sakit'],
    faith: ['faith', 'believe', 'trust', 'iman', 'percaya'],
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => lowerText.includes(kw))) {
      topics.push(topic);
    }
  }

  return topics;
}

/**
 * Get suggested follow-up prompts based on intent and message content
 */
export function getSuggestedPrompts(
  intent: Intent,
  userMessage: string,
  lang: 'en' | 'id' = 'en',
  limit: number = 3
): SuggestedPrompt[] {
  const suggestions: SuggestedPrompt[] = [];

  // 1. Add intent-based suggestions
  const intentSuggestions = INTENT_SUGGESTIONS[intent] || INTENT_SUGGESTIONS.general_faith;
  suggestions.push(...intentSuggestions);

  // 2. Add topic-based suggestions
  const topics = detectTopics(userMessage);
  for (const topic of topics) {
    if (TOPIC_SUGGESTIONS[topic]) {
      suggestions.push(...TOPIC_SUGGESTIONS[topic]);
    }
  }

  // 3. Remove duplicates and limit
  const uniqueSuggestions = suggestions.filter(
    (suggestion, index, self) =>
      index === self.findIndex(s => s.text === suggestion.text)
  );

  // 4. Return limited suggestions
  return uniqueSuggestions.slice(0, limit).map(s => ({
    ...s,
    // Return text in user's language
    text: lang === 'id' ? s.textId : s.text,
  }));
}

/**
 * Get contextual suggestions based on assistant's response
 */
export function getResponseBasedSuggestions(
  assistantResponse: string,
  lang: 'en' | 'id' = 'en',
  limit: number = 3
): SuggestedPrompt[] {
  const suggestions: SuggestedPrompt[] = [];

  // Detect if response mentions Scripture
  const hasScripture = /\d+:\d+|verse|ayat/i.test(assistantResponse);
  if (hasScripture) {
    suggestions.push({
      text: lang === 'id' ? 'Jelaskan ayat ini lebih dalam' : 'Explain this verse more deeply',
      textId: 'Jelaskan ayat ini lebih dalam',
      icon: '📖',
    });
  }

  // Detect if response is about prayer
  const hasPrayer = /pray|doa|berdoa/i.test(assistantResponse);
  if (hasPrayer) {
    suggestions.push({
      text: lang === 'id' ? 'Doakan saya tentang ini' : 'Pray for me about this',
      textId: 'Doakan saya tentang ini',
      icon: '🙏',
    });
  }

  // Always offer to continue
  suggestions.push({
    text: lang === 'id' ? 'Ceritakan lebih lanjut' : 'Tell me more',
    textId: 'Ceritakan lebih lanjut',
    icon: '💬',
  });

  return suggestions.slice(0, limit);
}

export default getSuggestedPrompts;
