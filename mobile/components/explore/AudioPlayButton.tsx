/**
 * AudioPlayButton Component
 *
 * A play/pause button for TTS audio in Explore content.
 * Used in Daily Devotion and Verse of the Day cards.
 *
 * Features:
 * - Play/pause toggle with efficient resume (no reload)
 * - Loading state
 * - Auto language detection
 * - Compact and full-width variants
 * - Auto-stop on unmount (when leaving page)
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { Play, Pause, Volume2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  speakText,
  speakTextCached,
  stopSpeaking,
  pauseSpeaking,
  canResume,
  preloadAudio,
  type CachedTTSOptions,
} from '@/services/voice/speechService';
import { useVoiceSettingsStore } from '@/stores/voiceSettings';

interface AudioPlayButtonProps {
  /** Text to read aloud */
  text: string;
  /** Button variant */
  variant?: 'icon' | 'compact' | 'full';
  /** Button label (for full variant) */
  label?: string;
  /** Custom size */
  size?: number;
  /** Custom colors */
  color?: string;
  /** Background color */
  backgroundColor?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Callback when playback starts */
  onStart?: () => void;
  /** Callback when playback ends */
  onEnd?: () => void;
  /**
   * Enable caching for daily content (devotions, verses, figures)
   * First user triggers API call, subsequent users get instant playback
   */
  cacheConfig?: {
    contentType: 'devotion' | 'verse' | 'figure';
    contentId: string;
  };
  /**
   * Automatically preload audio when component mounts
   * This fetches and caches audio in background so play is instant
   * Only works when cacheConfig is provided
   */
  autoPreload?: boolean;
}

type PlayState = 'idle' | 'loading' | 'playing' | 'paused';

export function AudioPlayButton({
  text,
  variant = 'icon',
  label = 'Listen',
  size = 40,
  color = '#4F46E5',
  backgroundColor = '#EEF2FF',
  disabled = false,
  onStart,
  onEnd,
  cacheConfig,
  autoPreload = false,
}: AudioPlayButtonProps) {
  const [state, setState] = useState<PlayState>('idle');
  const [isPreloaded, setIsPreloaded] = useState(false);
  const {
    getEffectiveApiKey,
    getEffectiveVoice,
    getEffectiveSpeed,
    isEnabled,
  } = useVoiceSettingsStore();

  // Track if component is mounted and if we're the active player
  const isMountedRef = useRef(true);
  const isActivePlayerRef = useRef(false);

  const apiKey = getEffectiveApiKey();
  const effectiveVoice = getEffectiveVoice();
  const effectiveSpeed = getEffectiveSpeed();
  const isAvailable = isEnabled && !!apiKey && !!text;

  // Cleanup on unmount - ALWAYS stop audio when leaving the page
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      isActivePlayerRef.current = false;
      // Always stop speaking when component unmounts (full cleanup)
      stopSpeaking();
    };
  }, []);

  // Auto-preload audio when component mounts (if enabled)
  // This fetches and caches audio in background so play is instant
  useEffect(() => {
    if (!autoPreload || !cacheConfig || !apiKey || !text || isPreloaded) return;

    // Fire and forget - preload in background
    preloadAudio(text, apiKey, {
      contentType: cacheConfig.contentType,
      contentId: cacheConfig.contentId,
      voice: effectiveVoice,
      speakingRate: effectiveSpeed,
    })
      .then((success) => {
        if (success && isMountedRef.current) {
          setIsPreloaded(true);
        }
      })
      .catch(() => {
        // Silently ignore preload errors
      });
  }, [autoPreload, cacheConfig, apiKey, text, isPreloaded, effectiveVoice, effectiveSpeed]);

  const handlePress = useCallback(async () => {
    if (!isAvailable || disabled) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If playing → pause (keep audio cached for instant resume)
    if (state === 'playing') {
      await pauseSpeaking();
      if (isMountedRef.current) {
        setState('paused');
      }
      return;
    }

    // If loading → cancel
    if (state === 'loading') {
      isActivePlayerRef.current = false;
      await stopSpeaking();
      if (isMountedRef.current) {
        setState('idle');
      }
      return;
    }

    // Start or resume playing
    try {
      isActivePlayerRef.current = true;

      // Check if we can resume (same text is cached in memory)
      const willResume = canResume(text);

      if (!willResume) {
        // Need to load fresh - show loading state
        setState('loading');
      }

      onStart?.();

      // Only proceed if still mounted and still active
      if (!isMountedRef.current || !isActivePlayerRef.current) return;

      const ttsOptions = {
        voice: effectiveVoice,
        speakingRate: effectiveSpeed,
        // Transition to 'playing' only when audio actually starts
        onPlaybackStart: () => {
          if (isMountedRef.current && isActivePlayerRef.current) {
            setState('playing');
          }
        },
      };

      // Use cached version for daily content (devotions, verses, figures)
      if (cacheConfig) {
        await speakTextCached(text, apiKey!, {
          ...ttsOptions,
          contentType: cacheConfig.contentType,
          contentId: cacheConfig.contentId,
        });
      } else {
        // Regular TTS without persistent caching
        await speakText(text, apiKey!, ttsOptions);
      }

      // Audio finished playing naturally
      if (isMountedRef.current && isActivePlayerRef.current) {
        setState('idle');
        isActivePlayerRef.current = false;
        onEnd?.();
      }
    } catch (error) {
      console.error('[AudioPlayButton] Error:', error);
      if (isMountedRef.current) {
        setState('idle');
      }
      isActivePlayerRef.current = false;
    }
  }, [state, text, apiKey, effectiveVoice, effectiveSpeed, isAvailable, disabled, onStart, onEnd, cacheConfig]);

  if (!isAvailable) {
    return null;
  }

  // Helper to get the right icon
  const renderIcon = (iconSize: number) => {
    if (state === 'loading') {
      return <ActivityIndicator size="small" color={color} />;
    }
    if (state === 'playing') {
      return <Pause size={iconSize} color={color} />;
    }
    // idle or paused - show play icon
    return <Play size={iconSize} color={color} style={{ marginLeft: iconSize * 0.1 }} />;
  };

  // Icon only variant
  if (variant === 'icon') {
    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        className={`items-center justify-center ${
          state === 'paused' ? 'opacity-85' : ''
        } ${disabled ? 'opacity-50' : ''}`}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
        }}
      >
        {renderIcon(size * 0.45)}
      </Pressable>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    const labelText =
      state === 'playing' ? 'Pause' :
      state === 'paused' ? 'Resume' :
      label;

    return (
      <Pressable
        onPress={handlePress}
        disabled={disabled}
        className={`flex-row items-center gap-1.5 py-1.5 px-3 rounded-2xl ${
          state === 'paused' ? 'opacity-85' : ''
        } ${disabled ? 'opacity-50' : ''}`}
        style={{ backgroundColor }}
      >
        {state === 'loading' ? (
          <ActivityIndicator size="small" color={color} />
        ) : state === 'playing' ? (
          <Pause size={16} color={color} />
        ) : (
          <Volume2 size={16} color={color} />
        )}
        <Text className="text-[13px] font-semibold" style={{ color }}>
          {labelText}
        </Text>
      </Pressable>
    );
  }

  // Full width variant
  const fullLabelText =
    state === 'loading' ? 'Loading...' :
    state === 'playing' ? 'Pause Audio' :
    state === 'paused' ? 'Resume Audio' :
    label;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      className={`rounded-xl py-3.5 px-4 ${
        state === 'paused' ? 'opacity-85' : ''
      } ${disabled ? 'opacity-50' : ''}`}
      style={{ backgroundColor }}
    >
      <View className="flex-row items-center justify-center gap-2">
        {state === 'loading' ? (
          <ActivityIndicator size="small" color={color} />
        ) : state === 'playing' ? (
          <Pause size={20} color={color} />
        ) : (
          <Volume2 size={20} color={color} />
        )}
        <Text className="text-[15px] font-semibold" style={{ color }}>
          {fullLabelText}
        </Text>
      </View>
    </Pressable>
  );
}

export default AudioPlayButton;
