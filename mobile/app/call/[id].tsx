/**
 * Call Screen
 *
 * Full-screen call interface for voice and video calls.
 * Handles outgoing, connecting, and active call states.
 *
 * Note: This is a basic implementation. Full LiveKit integration
 * requires @livekit/react-native package to be installed.
 */

import React, { useEffect, useCallback } from 'react';
import { View, StyleSheet, BackHandler, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { CallerInfo } from '@/components/call/CallerInfo';
import { CallControls } from '@/components/call/CallControls';
import {
  useCallStore,
  useCurrentCall,
  useCallUIState,
  useLocalParticipant,
  useRemoteParticipants,
  useCallDuration,
  useLiveKitConfig,
} from '@/stores/call';
import { CallType } from '@/types/call';
import { colors } from '@/constants/theme';
import { callSignalingService } from '@/services/callSignaling';

export default function CallScreen() {
  const { id: callId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Call state from store
  const uiState = useCallUIState();
  const currentCall = useCurrentCall();
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const callDuration = useCallDuration();
  const livekitConfig = useLiveKitConfig();

  // Store actions
  const {
    cancelCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
    reset,
  } = useCallStore();

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Don't allow back during active call - must use end call button
      if (uiState === 'active' || uiState === 'connecting') {
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [uiState]);

  // Subscribe to call topics when entering call
  useEffect(() => {
    if (currentCall?.call_id) {
      callSignalingService.subscribeToCallTopics(currentCall.call_id);
    }

    return () => {
      callSignalingService.unsubscribeFromCallTopics();
    };
  }, [currentCall?.call_id]);

  // Navigate away when call ends
  useEffect(() => {
    if (uiState === 'ended') {
      const timer = setTimeout(() => {
        router.back();
      }, 2000);
      return () => clearTimeout(timer);
    }

    if (uiState === 'idle' && !currentCall) {
      router.back();
    }

    return undefined;
  }, [uiState, currentCall, router]);

  // Get the other participant's info
  const getOtherParticipantInfo = useCallback(() => {
    if (!currentCall) return { name: 'Unknown', avatar: null };

    // For outgoing calls, show the first callee
    // For incoming calls, show the caller
    const otherParticipant = currentCall.participants.find(
      p => p.role === (uiState === 'outgoing' ? 'callee' : 'caller')
    ) || currentCall.participants[0];

    return {
      name: otherParticipant?.member_name || 'Unknown',
      avatar: otherParticipant?.member_avatar,
    };
  }, [currentCall, uiState]);

  const otherParticipant = getOtherParticipantInfo();

  // Handle end/cancel call
  const handleEndCall = async () => {
    if (uiState === 'outgoing') {
      await cancelCall();
    } else {
      await endCall('normal');
    }
  };

  // Don't render if no current call
  if (!currentCall && uiState === 'idle') {
    return null;
  }

  const isVideoCall = currentCall?.call_type === CallType.VIDEO;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'fade',
          gestureEnabled: false,
        }}
      />

      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        <LinearGradient
          colors={
            isVideoCall
              ? ['#1a1a1a', '#2d2d2d', '#1a1a1a']
              : ['#1a1a2e', '#16213e', '#0f3460']
          }
          style={styles.gradient}
        >
          {/* Video Call: Show video feeds */}
          {isVideoCall && uiState === 'active' && (
            <View style={styles.videoContainer}>
              {/* Remote video (full screen) */}
              <View style={styles.remoteVideo}>
                {remoteParticipants.size === 0 ? (
                  <View style={styles.noVideoPlaceholder}>
                    <CallerInfo
                      name={otherParticipant.name}
                      avatar={otherParticipant.avatar}
                      uiState={uiState}
                      duration={callDuration}
                    />
                  </View>
                ) : (
                  <View style={styles.noVideoPlaceholder}>
                    {/* Placeholder for LiveKit VideoTrack */}
                    <Text style={styles.videoPlaceholderText}>
                      Remote Video
                    </Text>
                    <Text style={styles.videoPlaceholderSubtext}>
                      {callDuration.formatted}
                    </Text>
                  </View>
                )}
              </View>

              {/* Local video (small overlay) */}
              {localParticipant.isVideoEnabled && (
                <View style={[styles.localVideo, { top: insets.top + 20 }]}>
                  {/* Placeholder for LiveKit VideoTrack */}
                  <Text style={styles.localVideoText}>You</Text>
                </View>
              )}
            </View>
          )}

          {/* Voice Call or Non-active states: Show caller info */}
          {(!isVideoCall || uiState !== 'active') && (
            <View style={styles.voiceCallContainer}>
              <CallerInfo
                name={otherParticipant.name}
                avatar={otherParticipant.avatar}
                uiState={uiState}
                duration={callDuration}
              />
            </View>
          )}

          {/* Call Ended Message */}
          {uiState === 'ended' && (
            <View style={styles.endedOverlay}>
              <Text style={styles.endedText}>Call Ended</Text>
              <Text style={styles.endedDuration}>
                Duration: {callDuration.formatted}
              </Text>
            </View>
          )}

          {/* Call Controls */}
          {uiState !== 'ended' && (
            <CallControls
              callType={currentCall?.call_type || CallType.VOICE}
              isMuted={localParticipant.isMuted}
              isVideoEnabled={localParticipant.isVideoEnabled}
              isSpeakerOn={localParticipant.isSpeakerOn}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onToggleSpeaker={toggleSpeaker}
              onSwitchCamera={switchCamera}
              onEndCall={handleEndCall}
            />
          )}
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  noVideoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: 'bold',
  },
  videoPlaceholderSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
    marginTop: 8,
  },
  localVideo: {
    position: 'absolute',
    right: 20,
    width: 100,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  localVideoText: {
    color: colors.white,
    fontSize: 14,
  },
  voiceCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  endedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endedText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  endedDuration: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 18,
  },
});
