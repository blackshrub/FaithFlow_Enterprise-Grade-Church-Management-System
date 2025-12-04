/**
 * Expo App Configuration
 *
 * This file allows dynamic configuration based on environment variables.
 * For production builds, set the API_URL environment variable:
 *
 *   API_URL=https://api.yourdomain.com eas build --platform android
 *
 * Or configure in eas.json for EAS Build.
 */

export default ({ config }) => {
  // API URL from environment variable or default
  const apiUrl = process.env.API_URL || 'https://api.yourdomain.com';
  const apiPrefix = process.env.API_PREFIX || ''; // Empty for subdomain mode

  return {
    ...config,
    extra: {
      ...config.extra,
      apiUrl,
      apiPrefix,
      // API keys injected via EAS Secrets at build time
      anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
      googleTtsApiKey: process.env.GOOGLE_TTS_API_KEY || null,
      groqApiKey: process.env.GROQ_API_KEY || null,
      openaiApiKey: process.env.OPENAI_API_KEY || null,
      router: {
        origin: false,
      },
      eas: {
        projectId: '78f7dcb7-b3c5-42d6-8a9c-062e4028a811',
      },
    },
  };
};
