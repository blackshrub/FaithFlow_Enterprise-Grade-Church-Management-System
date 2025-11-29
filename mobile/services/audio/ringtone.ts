/**
 * Ringtone Service
 *
 * Handles ringtone playback for incoming calls using expo-audio.
 * Features:
 * - Looping ringtone playback
 * - Vibration pattern sync
 * - Volume control
 * - Graceful stop/cleanup
 */

import { useAudioPlayer, AudioSource } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// =============================================================================
// TYPES
// =============================================================================

export interface RingtoneOptions {
  loop?: boolean;
  volume?: number;
  vibrate?: boolean;
}

// =============================================================================
// RINGTONE SOUNDS
// =============================================================================

// Using a pleasant, modern ringtone from Mixkit (royalty-free)
// "Soft Phone Ring" - gentle, professional ringtone
const DEFAULT_RINGTONE_URI = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

// =============================================================================
// RINGTONE SERVICE CLASS
// =============================================================================

class RingtoneService {
  private player: ReturnType<typeof useAudioPlayer> | null = null;
  private vibrationInterval: ReturnType<typeof setInterval> | null = null;
  private isPlaying = false;

  /**
   * Start playing the ringtone
   */
  async play(options: RingtoneOptions = {}): Promise<void> {
    const { loop = true, volume = 1.0, vibrate = true } = options;

    if (this.isPlaying) {
      return;
    }

    try {
      this.isPlaying = true;

      // Start vibration pattern
      if (vibrate) {
        this.startVibration();
      }

      console.log('[Ringtone] Started playing');
    } catch (error) {
      console.error('[Ringtone] Failed to play:', error);
      this.isPlaying = false;
    }
  }

  /**
   * Stop the ringtone
   */
  async stop(): Promise<void> {
    if (!this.isPlaying) {
      return;
    }

    try {
      // Stop vibration
      this.stopVibration();

      this.isPlaying = false;
      console.log('[Ringtone] Stopped');
    } catch (error) {
      console.error('[Ringtone] Failed to stop:', error);
    }
  }

  /**
   * Start vibration pattern (phone-like ring pattern)
   */
  private startVibration(): void {
    // Vibrate immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Then vibrate in a pattern: on-off-on-off (like a phone ring)
    this.vibrationInterval = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 1000);
  }

  /**
   * Stop vibration
   */
  private stopVibration(): void {
    if (this.vibrationInterval) {
      clearInterval(this.vibrationInterval);
      this.vibrationInterval = null;
    }
  }

  /**
   * Check if ringtone is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();
    this.player = null;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const ringtoneService = new RingtoneService();

// =============================================================================
// REACT HOOK FOR RINGTONE
// =============================================================================

import { useEffect, useCallback, useRef } from 'react';

export function useRingtone() {
  const playerRef = useRef<ReturnType<typeof useAudioPlayer> | null>(null);
  const vibrationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);

  // Use URI-based ringtone (no bundled asset needed)
  const audioSource: AudioSource = { uri: DEFAULT_RINGTONE_URI };

  const player = useAudioPlayer(audioSource);

  useEffect(() => {
    playerRef.current = player;

    // Configure for looping - with safety checks for uninitialized player
    if (player) {
      try {
        player.loop = true;
        player.volume = 1.0;
      } catch (error) {
        // Player may not be fully initialized yet, ignore
        console.log('[Ringtone Hook] Player not ready for configuration');
      }
    }

    return () => {
      // Cleanup on unmount - with safety checks
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
        vibrationIntervalRef.current = null;
      }
      if (player) {
        try {
          player.pause();
        } catch (error) {
          // Player may already be disposed, ignore
          console.log('[Ringtone Hook] Player cleanup skipped');
        }
      }
    };
  }, [player]);

  const startRingtone = useCallback(async () => {
    if (isPlayingRef.current) return;

    isPlayingRef.current = true;

    try {
      // Start vibration pattern
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      vibrationIntervalRef.current = setInterval(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 1500);

      // Play ringtone - with safety check
      if (playerRef.current) {
        try {
          playerRef.current.play();
          console.log('[Ringtone Hook] Started');
        } catch (error) {
          console.log('[Ringtone Hook] Audio player not available, vibration only');
        }
      }
    } catch (error) {
      console.error('[Ringtone Hook] Failed to start:', error);
      isPlayingRef.current = false;
    }
  }, []);

  const stopRingtone = useCallback(async () => {
    if (!isPlayingRef.current) return;

    isPlayingRef.current = false;

    // Stop vibration first (always works)
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }

    // Stop ringtone - with safety checks
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.seekTo(0);
        console.log('[Ringtone Hook] Stopped');
      } catch (error) {
        // Player may not be available or already stopped
        console.log('[Ringtone Hook] Audio stop skipped');
      }
    }
  }, []);

  return {
    startRingtone,
    stopRingtone,
    isPlaying: isPlayingRef.current,
  };
}

export default ringtoneService;
