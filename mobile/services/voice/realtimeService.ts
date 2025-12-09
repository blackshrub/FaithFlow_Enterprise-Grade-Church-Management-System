/**
 * OpenAI Realtime API Service
 *
 * Provides real-time voice conversations using OpenAI's Realtime API
 * with WebRTC for sub-200ms latency voice-to-voice interactions.
 *
 * Architecture:
 * 1. Mobile app requests ephemeral token from backend
 * 2. WebRTC connection established directly to OpenAI
 * 3. Audio streams bidirectionally in real-time
 * 4. AI responses are streamed back as audio
 *
 * Features:
 * - ~200ms latency (vs 2-4s with traditional TTS/STT)
 * - Server VAD for natural conversation flow
 * - Automatic turn detection
 * - Full-duplex audio streaming
 */

import {
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
  MediaStreamTrack,
} from '@livekit/react-native-webrtc';
import { api } from '@/services/api';
import { API_PREFIX } from '@/constants/api';

// Event types for Realtime API
export type RealtimeEventType =
  | 'session.created'
  | 'session.updated'
  | 'input_audio_buffer.speech_started'
  | 'input_audio_buffer.speech_stopped'
  | 'input_audio_buffer.committed'
  | 'conversation.item.created'
  | 'response.created'
  | 'response.output_item.added'
  | 'response.audio.delta'
  | 'response.audio.done'
  | 'response.audio_transcript.delta'
  | 'response.audio_transcript.done'
  | 'response.text.delta'
  | 'response.text.done'
  | 'response.done'
  | 'error';

export interface RealtimeEvent {
  type: RealtimeEventType;
  event_id?: string;
  [key: string]: any;
}

export interface RealtimeSessionConfig {
  /** Voice for AI responses */
  voice?: 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'sage' | 'shimmer' | 'verse';
  /** Model to use */
  model?: string;
  /** System instructions for the AI */
  instructions?: string;
  /** Input audio format */
  inputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  /** Output audio format */
  outputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  /** Turn detection mode */
  turnDetection?: {
    type: 'server_vad' | 'none';
    threshold?: number;
    prefix_padding_ms?: number;
    silence_duration_ms?: number;
    create_response?: boolean;
  };
  /** Tools/functions the AI can call */
  tools?: Array<{
    type: 'function';
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
}

export interface RealtimeCallbacks {
  /** Called when connection is established */
  onConnected?: () => void;
  /** Called when connection is closed */
  onDisconnected?: () => void;
  /** Called when user starts speaking */
  onSpeechStarted?: () => void;
  /** Called when user stops speaking */
  onSpeechStopped?: () => void;
  /** Called when AI starts responding */
  onResponseStarted?: () => void;
  /** Called with partial transcript of AI response */
  onTranscriptDelta?: (delta: string, fullText: string) => void;
  /** Called when AI finishes responding */
  onResponseDone?: (transcript: string) => void;
  /** Called on any error */
  onError?: (error: Error) => void;
  /** Called with raw events (for debugging) */
  onEvent?: (event: RealtimeEvent) => void;
  /** Called when audio track is received from AI */
  onRemoteAudioTrack?: (track: MediaStreamTrack) => void;
}

// Connection state
let peerConnection: RTCPeerConnection | null = null;
let dataChannel: RTCDataChannel | null = null;
let localStream: MediaStream | null = null;
let isConnected = false;
let currentCallbacks: RealtimeCallbacks | null = null;
let currentTranscript = '';

// Default session configuration for Faith Assistant
const DEFAULT_SESSION_CONFIG: RealtimeSessionConfig = {
  voice: 'verse',
  model: 'gpt-4o-realtime-preview-2024-12-17',
  inputAudioFormat: 'pcm16',
  outputAudioFormat: 'pcm16',
  turnDetection: {
    type: 'server_vad',
    threshold: 0.5,
    prefix_padding_ms: 300,
    silence_duration_ms: 500,
    create_response: true,
  },
};

/**
 * Get ephemeral token from backend
 */
async function getEphemeralToken(
  voice?: string,
  model?: string
): Promise<{ clientSecret: string; expiresAt: number }> {
  try {
    const { data } = await api.post(`${API_PREFIX}/system/settings/voice/realtime-session`, {
      voice: voice || 'verse',
      model: model || 'gpt-4o-realtime-preview-2024-12-17',
    });

    if (!data.client_secret) {
      throw new Error('No client secret returned');
    }

    return {
      clientSecret: data.client_secret,
      expiresAt: data.expires_at,
    };
  } catch (error: any) {
    console.error('[Realtime] Failed to get ephemeral token:', error);
    throw new Error(error.response?.data?.detail || 'Failed to get realtime session token');
  }
}

/**
 * Connect to OpenAI Realtime API
 */
export async function connect(
  config?: Partial<RealtimeSessionConfig>,
  callbacks?: RealtimeCallbacks
): Promise<void> {
  if (isConnected) {
    console.warn('[Realtime] Already connected');
    return;
  }

  const sessionConfig = { ...DEFAULT_SESSION_CONFIG, ...config };
  currentCallbacks = callbacks || null;
  currentTranscript = '';

  console.log('[Realtime] Starting connection...');

  try {
    // 1. Get ephemeral token from backend
    const { clientSecret } = await getEphemeralToken(
      sessionConfig.voice,
      sessionConfig.model
    );

    // 2. Get microphone access
    // Note: React Native WebRTC types may not include all audio constraints
    localStream = await mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 24000,
      } as any,
      video: false,
    });

    // 3. Create peer connection
    peerConnection = new RTCPeerConnection({
      iceServers: [], // OpenAI doesn't require STUN/TURN
    });

    // 4. Add local audio track
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      peerConnection.addTrack(audioTrack, localStream);
    }

    // 5. Handle incoming audio from AI
    // Note: React Native WebRTC uses different event handler pattern
    (peerConnection as any).ontrack = (event: { track: MediaStreamTrack }) => {
      console.log('[Realtime] Received remote track');
      if (event.track.kind === 'audio') {
        currentCallbacks?.onRemoteAudioTrack?.(event.track);
      }
    };

    // 6. Create data channel for events
    const channel = peerConnection.createDataChannel('oai-events');
    dataChannel = channel as any;
    setupDataChannelHandlers(dataChannel as RTCDataChannel, sessionConfig);

    // 7. Create and set local description
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await peerConnection.setLocalDescription(offer);

    // 8. Send offer to OpenAI and get answer
    const baseUrl = 'https://api.openai.com/v1/realtime';
    const model = sessionConfig.model || 'gpt-4o-realtime-preview-2024-12-17';

    const response = await fetch(`${baseUrl}?model=${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      },
      body: offer.sdp,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to connect: ${response.status} - ${errorText}`);
    }

    const answerSdp = await response.text();
    const answer = new RTCSessionDescription({
      type: 'answer',
      sdp: answerSdp,
    });
    await peerConnection.setRemoteDescription(answer);

    isConnected = true;
    console.log('[Realtime] Connected successfully');

  } catch (error) {
    console.error('[Realtime] Connection failed:', error);
    cleanup();
    throw error;
  }
}

/**
 * Setup data channel event handlers
 */
function setupDataChannelHandlers(
  dc: RTCDataChannel,
  config: RealtimeSessionConfig
): void {
  dc.onopen = () => {
    console.log('[Realtime] Data channel opened');

    // Send session configuration
    sendEvent({
      type: 'session.update',
      session: {
        instructions: config.instructions || getDefaultInstructions(),
        voice: config.voice,
        input_audio_format: config.inputAudioFormat,
        output_audio_format: config.outputAudioFormat,
        turn_detection: config.turnDetection,
        tools: config.tools,
      },
    });

    currentCallbacks?.onConnected?.();
  };

  dc.onclose = () => {
    console.log('[Realtime] Data channel closed');
    isConnected = false;
    currentCallbacks?.onDisconnected?.();
  };

  dc.onerror = (event) => {
    console.error('[Realtime] Data channel error:', event);
    currentCallbacks?.onError?.(new Error('Data channel error'));
  };

  dc.onmessage = (event) => {
    try {
      const realtimeEvent: RealtimeEvent = JSON.parse(event.data);
      handleRealtimeEvent(realtimeEvent);
    } catch (error) {
      console.error('[Realtime] Failed to parse event:', error);
    }
  };
}

/**
 * Handle incoming Realtime API events
 */
function handleRealtimeEvent(event: RealtimeEvent): void {
  // Forward raw event if callback exists
  currentCallbacks?.onEvent?.(event);

  switch (event.type) {
    case 'session.created':
      console.log('[Realtime] Session created:', event.session?.id);
      break;

    case 'session.updated':
      console.log('[Realtime] Session updated');
      break;

    case 'input_audio_buffer.speech_started':
      console.log('[Realtime] User started speaking');
      currentCallbacks?.onSpeechStarted?.();
      break;

    case 'input_audio_buffer.speech_stopped':
      console.log('[Realtime] User stopped speaking');
      currentCallbacks?.onSpeechStopped?.();
      break;

    case 'response.created':
      console.log('[Realtime] AI response started');
      currentTranscript = '';
      currentCallbacks?.onResponseStarted?.();
      break;

    case 'response.audio_transcript.delta':
      if (event.delta) {
        currentTranscript += event.delta;
        currentCallbacks?.onTranscriptDelta?.(event.delta, currentTranscript);
      }
      break;

    case 'response.audio_transcript.done':
      console.log('[Realtime] AI response transcript done');
      break;

    case 'response.done':
      console.log('[Realtime] AI response complete');
      currentCallbacks?.onResponseDone?.(currentTranscript);
      break;

    case 'error':
      console.error('[Realtime] Error event:', event.error);
      currentCallbacks?.onError?.(new Error(event.error?.message || 'Realtime API error'));
      break;

    default:
      // Log unhandled events for debugging
      if (event.type && !event.type.includes('delta')) {
        console.log('[Realtime] Event:', event.type);
      }
  }
}

/**
 * Send event to Realtime API via data channel
 */
export function sendEvent(event: Record<string, any>): void {
  if (!dataChannel || dataChannel.readyState !== 'open') {
    console.warn('[Realtime] Data channel not ready');
    return;
  }

  try {
    dataChannel.send(JSON.stringify(event));
  } catch (error) {
    console.error('[Realtime] Failed to send event:', error);
  }
}

/**
 * Send text message to the conversation
 */
export function sendTextMessage(text: string): void {
  sendEvent({
    type: 'conversation.item.create',
    item: {
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'input_text',
          text,
        },
      ],
    },
  });

  // Trigger response generation
  sendEvent({
    type: 'response.create',
  });
}

/**
 * Interrupt the current AI response
 */
export function interruptResponse(): void {
  sendEvent({
    type: 'response.cancel',
  });
}

/**
 * Mute/unmute local audio
 */
export function setMuted(muted: boolean): void {
  if (localStream) {
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }
}

/**
 * Check if currently connected
 */
export function getIsConnected(): boolean {
  return isConnected;
}

/**
 * Disconnect from Realtime API
 */
export async function disconnect(): Promise<void> {
  console.log('[Realtime] Disconnecting...');
  cleanup();
}

/**
 * Cleanup resources
 */
function cleanup(): void {
  if (dataChannel) {
    dataChannel.close();
    dataChannel = null;
  }

  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }

  isConnected = false;
  currentCallbacks = null;
  currentTranscript = '';
}

/**
 * Get default instructions for Faith Assistant
 */
function getDefaultInstructions(): string {
  return `You are "Faith Assistant" (Pendamping Iman), a warm, supportive spiritual companion for FaithFlow church app users.

Your role:
- Provide compassionate spiritual guidance based on Biblical principles
- Help users understand Scripture and apply it to daily life
- Offer encouraging words and prayerful support
- Be conversational and warm, like a trusted friend
- Speak naturally as this is a voice conversation

Guidelines:
- Keep responses concise for voice (2-3 sentences typically)
- Be respectful of all Christian denominations
- Offer to pray with users when appropriate
- Reference relevant Bible verses when helpful
- Acknowledge emotions with empathy before offering guidance
- If asked about non-spiritual topics, gently redirect to faith matters

Language:
- Respond in the same language the user speaks
- Support both English and Indonesian (Bahasa Indonesia)
- Use warm, conversational tone appropriate for voice

Remember: You're having a real-time voice conversation. Keep responses natural and flowing.`;
}

export default {
  connect,
  disconnect,
  sendEvent,
  sendTextMessage,
  interruptResponse,
  setMuted,
  getIsConnected,
};
