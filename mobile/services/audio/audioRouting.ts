/**
 * Audio Routing Service
 *
 * Manages audio output routing for calls.
 * Features:
 * - Speaker/Earpiece switching
 * - Bluetooth headset detection
 * - Audio session configuration
 * - Platform-specific handling
 */

import { Platform, NativeModules } from 'react-native';
import { create } from 'zustand';
import { AudioSession } from '@livekit/react-native';

// =============================================================================
// TYPES
// =============================================================================

export type AudioOutput = 'earpiece' | 'speaker' | 'bluetooth' | 'headphones';

export interface AudioRoutingState {
  currentOutput: AudioOutput;
  availableOutputs: AudioOutput[];
  isSpeakerOn: boolean;
  isBluetoothConnected: boolean;
}

export interface AudioRoutingActions {
  setSpeakerOn: (enabled: boolean) => void;
  toggleSpeaker: () => void;
  setAudioOutput: (output: AudioOutput) => void;
  configureForCall: (isVideoCall: boolean) => void;
  resetAudioMode: () => void;
}

// =============================================================================
// AUDIO ROUTING STORE
// =============================================================================

export const useAudioRoutingStore = create<AudioRoutingState & AudioRoutingActions>(
  (set, get) => ({
    // State
    currentOutput: 'earpiece',
    availableOutputs: ['earpiece', 'speaker'],
    isSpeakerOn: false,
    isBluetoothConnected: false,

    // Actions
    setSpeakerOn: (enabled: boolean) => {
      set({
        isSpeakerOn: enabled,
        currentOutput: enabled ? 'speaker' : 'earpiece',
      });
      // Apply audio routing
      configureLiveKitAudio(enabled);
    },

    toggleSpeaker: () => {
      const { isSpeakerOn } = get();
      get().setSpeakerOn(!isSpeakerOn);
    },

    setAudioOutput: (output: AudioOutput) => {
      set({
        currentOutput: output,
        isSpeakerOn: output === 'speaker',
      });
      configureLiveKitAudio(output === 'speaker');
    },

    configureForCall: (isVideoCall: boolean) => {
      // Video calls default to speaker, voice calls to earpiece
      set({
        isSpeakerOn: isVideoCall,
        currentOutput: isVideoCall ? 'speaker' : 'earpiece',
      });
      configureLiveKitAudio(isVideoCall);
    },

    resetAudioMode: () => {
      set({
        isSpeakerOn: false,
        currentOutput: 'earpiece',
      });
      configureLiveKitAudio(false);
    },
  })
);

// =============================================================================
// AUDIO ROUTING UTILITIES
// =============================================================================

/**
 * Check if speaker is available
 */
export function isSpeakerAvailable(): boolean {
  // Speaker is always available on mobile devices
  return true;
}

/**
 * Get human-readable audio output name
 */
export function getAudioOutputLabel(output: AudioOutput): string {
  switch (output) {
    case 'speaker':
      return 'Speaker';
    case 'earpiece':
      return 'Phone';
    case 'bluetooth':
      return 'Bluetooth';
    case 'headphones':
      return 'Headphones';
    default:
      return 'Unknown';
  }
}

// =============================================================================
// LIVEKIT AUDIO ROUTING
// =============================================================================

/**
 * Configure LiveKit room audio for speaker/earpiece
 * This works with @livekit/react-native's audio session
 *
 * Note: LiveKit React Native handles audio routing through the Room.
 * For iOS, we use AVAudioSession; for Android, we use AudioManager.
 * The actual implementation is handled by LiveKit's native modules.
 */
export async function configureLiveKitAudio(speakerOn: boolean): Promise<void> {
  try {
    console.log('[AudioRouting] Setting speaker:', speakerOn ? 'ON' : 'OFF');

    // Use LiveKit's AudioSession to configure audio output
    // This handles both iOS (AVAudioSession) and Android (AudioManager)
    await AudioSession.configureAudio({
      android: {
        // For Android, set the audio mode
        preferredOutputList: speakerOn
          ? ['speaker', 'earpiece']
          : ['earpiece', 'speaker'],
        audioTypeOptions: {
          manageAudioFocus: true,
          audioMode: 'inCommunication',
          audioFocusMode: 'gain',
          audioStreamType: 'voiceCall',
          audioAttributesUsageType: 'voiceCommunication',
        },
      },
      ios: {
        // For iOS, set the category options
        defaultOutput: speakerOn ? 'speaker' : 'earpiece',
      },
    });

    console.log('[AudioRouting] Audio configured successfully');
  } catch (error) {
    console.error('[AudioRouting] Failed to configure audio:', error);

    // Fallback: Try using native modules directly
    try {
      if (Platform.OS === 'android') {
        // Android fallback using InCallManager if available
        const InCallManager = NativeModules.InCallManager;
        if (InCallManager?.setSpeakerphoneOn) {
          InCallManager.setSpeakerphoneOn(speakerOn);
          console.log('[AudioRouting] Android speaker set via InCallManager');
        }
      }
    } catch (fallbackError) {
      console.error('[AudioRouting] Fallback also failed:', fallbackError);
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  useAudioRoutingStore,
  configureLiveKitAudio,
  isSpeakerAvailable,
  getAudioOutputLabel,
};
