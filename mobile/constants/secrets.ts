/**
 * Secret API Keys
 *
 * These are injected at build time via EAS Secrets.
 * Set them in EAS dashboard or via CLI:
 *   eas secret:create --name ANTHROPIC_API_KEY --value "sk-ant-..."
 *
 * For local development, create a .env.local file with these values.
 */

import Constants from 'expo-constants';

// Get secrets from EAS build environment or expo-constants
const extra = Constants.expoConfig?.extra || {};

// Anthropic Claude API key for Faith Assistant
export const DEV_ANTHROPIC_API_KEY: string | null =
  extra.anthropicApiKey || process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY || null;

// Google Cloud TTS API key
export const DEV_GOOGLE_TTS_API_KEY: string | null =
  extra.googleTtsApiKey || process.env.EXPO_PUBLIC_GOOGLE_TTS_API_KEY || null;

// Groq API key for fast STT (~10x faster than OpenAI)
export const DEV_GROQ_API_KEY: string | null =
  extra.groqApiKey || process.env.EXPO_PUBLIC_GROQ_API_KEY || null;

// OpenAI API key (for STT fallback if Groq not available)
export const DEV_OPENAI_API_KEY: string | null =
  extra.openaiApiKey || process.env.EXPO_PUBLIC_OPENAI_API_KEY || null;
