/**
 * Voice Services - Unified Export
 *
 * Complete voice integration for Faith Assistant:
 * - Speech-to-Text (STT): OpenAI Whisper - auto language detection
 * - Text-to-Speech (TTS): OpenAI TTS - bilingual voice support
 *
 * Usage:
 * ```tsx
 * import { speakText, startRecording, stopAndTranscribe } from '@/services/voice';
 *
 * // Speak response
 * await speakText(responseText, OPENAI_API_KEY);
 *
 * // Record and transcribe
 * await startRecording();
 * // ... user speaks ...
 * const result = await stopAndTranscribe(OPENAI_API_KEY);
 * console.log(result.text); // Transcribed text
 * ```
 */

// Speech Service (TTS)
export {
  speakText,
  stopSpeaking,
  isSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  getAvailableVoices,
  getVoiceDescription,
  getVoiceForLanguage,
  type TTSModel,
  type TTSVoice,
  type TTSOptions,
} from './speechService';
export { default as speechService } from './speechService';

// Voice Input Service (STT)
export {
  startRecording,
  stopRecording,
  cancelRecording,
  getRecordingState,
  isRecording,
  transcribeAudio,
  stopAndTranscribe,
  getTranscriptionPrompt,
  TRANSCRIPTION_PROMPTS,
  type WhisperModel,
  type TranscriptionOptions,
  type TranscriptionResult,
  type RecordingState,
} from './voiceInputService';
export { default as voiceInputService } from './voiceInputService';
