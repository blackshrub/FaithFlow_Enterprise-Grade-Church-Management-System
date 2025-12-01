/**
 * LiveKit Room Component
 *
 * Main component for connecting to LiveKit WebRTC rooms.
 * Handles:
 * - Room connection lifecycle
 * - Audio/video track management
 * - Participant state
 * - Network quality monitoring
 * - Screen sharing
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Dimensions, Platform, StyleSheet } from 'react-native';
import {
  Room,
  RoomOptions,
  ConnectionState,
  LocalParticipant,
  RemoteParticipant,
  Participant,
  Track,
  ConnectionQuality,
  RoomEvent,
  TrackPublication,
  LocalTrackPublication,
  RemoteTrackPublication,
  VideoPresets,
  AudioPresets,
} from 'livekit-client';
import {
  useRoom,
  useTracks,
  useParticipants,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
  VideoTrack as LKVideoTrack,
  LiveKitRoom as LKRoom,
  isTrackReference,
} from '@livekit/react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { CallType, NetworkQuality } from '@/types/call';
import { useCallStore } from '@/stores/call';
import { callApi } from '@/services/api/call';

// =============================================================================
// TYPES
// =============================================================================

interface LiveKitRoomProps {
  url: string;
  token: string;
  callType: CallType;
  callId: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  children?: React.ReactNode;
}

interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  connectionQuality: ConnectionQuality;
}

// =============================================================================
// ROOM OPTIONS
// =============================================================================

const getRoomOptions = (callType: CallType): RoomOptions => ({
  // Audio configuration
  audioCaptureDefaults: {
    autoGainControl: true,
    echoCancellation: true,
    noiseSuppression: true,
  },
  // Video configuration
  videoCaptureDefaults: {
    resolution: callType === CallType.VIDEO ? VideoPresets.h720 : undefined,
    facingMode: 'user',
  },
  // Adaptive streaming for bandwidth management
  adaptiveStream: true,
  // Dynacast for optimized video quality
  dynacast: true,
  // Disconnect on page hide (for background handling)
  disconnectOnPageLeave: false,
  // Stop local tracks when backgrounded
  stopLocalTrackOnUnpublish: true,
});

// =============================================================================
// LIVEKIT ROOM WRAPPER
// =============================================================================

export function LiveKitRoom({
  url,
  token,
  callType,
  callId,
  onConnected,
  onDisconnected,
  onError,
  children,
}: LiveKitRoomProps) {
  const roomOptions = useMemo(() => getRoomOptions(callType), [callType]);

  return (
    <LKRoom
      serverUrl={url}
      token={token}
      connect={true}
      options={roomOptions}
      audio={true}
      video={callType === CallType.VIDEO}
      onConnected={() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Mark call as connected on backend
        callApi.markConnected(callId).catch(() => {});

        onConnected?.();
      }}
      onDisconnected={() => {
        onDisconnected?.();
      }}
      onError={(error) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        onError?.(error);
      }}
    >
      <RoomContent callType={callType} callId={callId}>
        {children}
      </RoomContent>
    </LKRoom>
  );
}

// =============================================================================
// ROOM CONTENT (Inside LiveKit Context)
// =============================================================================

interface RoomContentProps {
  callType: CallType;
  callId: string;
  children?: React.ReactNode;
}

function RoomContent({ callType, callId, children }: RoomContentProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();

  const {
    localParticipant: localState,
    toggleMute: storeToggleMute,
    toggleVideo: storeToggleVideo,
    toggleSpeaker: storeToggleSpeaker,
  } = useCallStore();

  // Sync local participant state with LiveKit
  useEffect(() => {
    if (!localParticipant) return;

    // Sync mute state
    const audioTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
    if (audioTrack && audioTrack.isMuted !== localState.isMuted) {
      if (localState.isMuted) {
        localParticipant.setMicrophoneEnabled(false);
      } else {
        localParticipant.setMicrophoneEnabled(true);
      }
    }

    // Sync video state
    if (callType === CallType.VIDEO) {
      const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
      if (videoTrack && videoTrack.isMuted !== !localState.isVideoEnabled) {
        localParticipant.setCameraEnabled(localState.isVideoEnabled);
      }
    }
  }, [localParticipant, localState.isMuted, localState.isVideoEnabled, callType]);

  // Monitor connection state changes
  useEffect(() => {
    if (connectionState === ConnectionState.Connected) {
      useCallStore.getState().startDurationTimer();
    }
  }, [connectionState]);

  // Handle room events
  useEffect(() => {
    if (!room) return;

    const handleParticipantConnected = (participant: RemoteParticipant) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleParticipantDisconnected = (participant: RemoteParticipant) => {
      // Participant disconnected
    };

    const handleActiveSpeakersChanged = (speakers: Participant[]) => {
      // Can be used to highlight active speaker
    };

    const handleConnectionQualityChanged = (
      quality: ConnectionQuality,
      participant: Participant
    ) => {
      if (participant === room.localParticipant) {
        // Update local network quality in store
        const qualityMap: Record<ConnectionQuality, NetworkQuality['level']> = {
          [ConnectionQuality.Excellent]: 'excellent',
          [ConnectionQuality.Good]: 'good',
          [ConnectionQuality.Poor]: 'fair',
          [ConnectionQuality.Lost]: 'poor',
          [ConnectionQuality.Unknown]: 'unknown',
        };

        useCallStore.setState({
          networkQuality: { level: qualityMap[quality] }
        });
      }
    };

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
    room.on(RoomEvent.ConnectionQualityChanged, handleConnectionQualityChanged);

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
      room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChanged);
      room.off(RoomEvent.ConnectionQualityChanged, handleConnectionQualityChanged);
    };
  }, [room]);

  return (
    <View className="flex-1">
      {children}
    </View>
  );
}

// =============================================================================
// VIDEO TRACK COMPONENT
// =============================================================================

interface VideoTrackProps {
  trackPublication?: TrackPublication;
  participant?: LocalParticipant | RemoteParticipant;
  style?: any;
  mirror?: boolean;
  objectFit?: 'cover' | 'contain';
}

export function VideoTrack({
  trackPublication,
  participant,
  style,
  mirror = false,
  objectFit = 'cover',
}: VideoTrackProps) {
  const track = trackPublication?.track;

  if (!track || track.kind !== Track.Kind.Video) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={[{ backgroundColor: colors.gray[800] }, style]}
      >
        <Text className="text-5xl font-bold text-white">
          {participant?.name?.charAt(0).toUpperCase() || '?'}
        </Text>
      </View>
    );
  }

  return (
    <LKVideoTrack
      trackRef={{ participant, publication: trackPublication, source: trackPublication.source } as any}
      style={StyleSheet.flatten([{ flex: 1, backgroundColor: '#000' }, style])}
      mirror={mirror}
      objectFit={objectFit}
    />
  );
}

// =============================================================================
// PARTICIPANT TILE COMPONENT
// =============================================================================

interface ParticipantTileProps {
  participant: LocalParticipant | RemoteParticipant;
  isLocal?: boolean;
  style?: any;
  showName?: boolean;
  showMuteIndicator?: boolean;
}

export function ParticipantTile({
  participant,
  isLocal = false,
  style,
  showName = true,
  showMuteIndicator = true,
}: ParticipantTileProps) {
  const videoTrack = participant.getTrackPublication(Track.Source.Camera);
  const audioTrack = participant.getTrackPublication(Track.Source.Microphone);
  const isMuted = audioTrack?.isMuted ?? true;
  const isVideoEnabled = videoTrack && !videoTrack.isMuted;

  return (
    <View
      className="flex-1 rounded-xl overflow-hidden relative"
      style={[{ backgroundColor: colors.gray[900] }, style]}
    >
      {isVideoEnabled ? (
        <VideoTrack
          trackPublication={videoTrack}
          participant={participant}
          mirror={isLocal}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: colors.gray[800] }}
        >
          <View
            className="items-center justify-center"
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.primary[500],
            }}
          >
            <Text className="text-3xl font-bold text-white">
              {participant.name?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
        </View>
      )}

      {/* Name and status overlay */}
      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between p-2"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      >
        {showName && (
          <View className="flex-1">
            <Text className="text-sm font-medium text-white" numberOfLines={1}>
              {isLocal ? 'You' : participant.name || 'Unknown'}
            </Text>
          </View>
        )}

        {showMuteIndicator && isMuted && (
          <View
            className="items-center justify-center"
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
            }}
          >
            <Text className="text-xs">🔇</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// =============================================================================
// NETWORK QUALITY INDICATOR
// =============================================================================

interface NetworkQualityIndicatorProps {
  quality: ConnectionQuality;
  size?: 'sm' | 'md' | 'lg';
}

export function NetworkQualityIndicator({
  quality,
  size = 'md',
}: NetworkQualityIndicatorProps) {
  const bars = useMemo(() => {
    switch (quality) {
      case ConnectionQuality.Excellent:
        return 4;
      case ConnectionQuality.Good:
        return 3;
      case ConnectionQuality.Poor:
        return 2;
      case ConnectionQuality.Lost:
        return 1;
      default:
        return 0;
    }
  }, [quality]);

  const getColor = useCallback((barIndex: number) => {
    if (barIndex >= bars) return colors.gray[400];
    if (bars >= 3) return colors.success[500];
    if (bars === 2) return colors.warning[500];
    return colors.error[500];
  }, [bars]);

  const barHeight = size === 'sm' ? 8 : size === 'md' ? 12 : 16;
  const barWidth = size === 'sm' ? 3 : size === 'md' ? 4 : 5;
  const gap = size === 'sm' ? 1 : 2;

  return (
    <View className="flex-row items-end" style={{ gap }}>
      {[0, 1, 2, 3].map((index) => (
        <View
          key={index}
          className="rounded-[1px]"
          style={{
            width: barWidth,
            height: barHeight * ((index + 1) / 4),
            backgroundColor: getColor(index),
          }}
        />
      ))}
    </View>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

export function useLocalTracks() {
  const { localParticipant } = useLocalParticipant();

  const toggleMicrophone = useCallback(async () => {
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [localParticipant]);

  const toggleCamera = useCallback(async () => {
    if (!localParticipant) return;
    await localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [localParticipant]);

  const switchCamera = useCallback(async () => {
    if (!localParticipant) return;
    const videoTrack = localParticipant.getTrackPublication(Track.Source.Camera);
    if (videoTrack?.track && 'switchCamera' in videoTrack.track) {
      // switchCamera is available on LocalVideoTrack in React Native
      await (videoTrack.track as any).switchCamera();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [localParticipant]);

  return {
    toggleMicrophone,
    toggleCamera,
    switchCamera,
    isMicrophoneEnabled: localParticipant?.isMicrophoneEnabled ?? false,
    isCameraEnabled: localParticipant?.isCameraEnabled ?? false,
  };
}

export function useScreenShare() {
  const { localParticipant } = useLocalParticipant();
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant) return;

    try {
      if (isScreenSharing) {
        await localParticipant.setScreenShareEnabled(false);
        setIsScreenSharing(false);
      } else {
        await localParticipant.setScreenShareEnabled(true);
        setIsScreenSharing(true);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Screen share failed silently
    }
  }, [localParticipant, isScreenSharing]);

  return {
    isScreenSharing,
    toggleScreenShare,
  };
}

export default LiveKitRoom;
