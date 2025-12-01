/**
 * Voice Services - Unified Export
 *
 * Complete voice integration for Faith Assistant:
 * - Speech-to-Text (STT): Groq/OpenAI Whisper - auto language detection
 * - Text-to-Speech (TTS): Google Cloud TTS - bilingual WaveNet voice support
 *
 * Usage:
 * ```tsx
 * import { speakText, startRecording, stopAndTranscribe } from '@/services/voice';
 *
 * // Speak response
 * await speakText(responseText, GOOGLE_TTS_API_KEY);
 *
 * // Record and transcribe
 * await startRecording();
 * // ... user speaks ...
 * const result = await stopAndTranscribe(GROQ_API_KEY);
 * console.log(result.text); // Transcribed text
 * ```
 */

// Speech Service (TTS) - Google Cloud TTS
export {
  speakText,
  stopSpeaking,
  isSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  getAvailableVoices,
  getVoiceDescription,
  getVoiceForLanguage,
  type GoogleTTSVoice,
  type TTSOptions,
} from './speechService';
export { default as speechService } from './speechService';

// Voice Input Service (STT) - Groq/OpenAI Whisper
export {
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording,
  getRecordingDuration,
  isMaxDurationReached,
  transcribeAudio,
  stopAndTranscribe,
  getTranscriptionPrompt,
  TRANSCRIPTION_PROMPTS,
  type STTProvider,
  type TranscriptionOptions,
  type TranscriptionResult,
} from './voiceInputService';
export { default as voiceInputService } from './voiceInputService';
