/**
 * Call Screen
 *
 * Full-screen call interface for voice and video calls.
 * Features:
 * - Real LiveKit WebRTC video/audio
 * - Grid/speaker layouts for group calls
 * - Network quality indicators
 * - Screen sharing (Android)
 * - Background audio mode
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  BackHandler,
  StatusBar,
  Dimensions,
  Pressable,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useParticipants,
  useConnectionState,
  useLocalParticipant,
} from '@livekit/react-native';
import { ConnectionState, Track, ConnectionQuality } from 'livekit-client';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useKeepAwake } from 'expo-keep-awake';
import {
  Grid,
  ScreenShare,
  ScreenShareOff,
  Signal,
  Wifi,
  WifiOff,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { CallerInfo } from '@/components/call/CallerInfo';
import { CallControls } from '@/components/call/CallControls';
import {
  LiveKitRoom,
  ParticipantTile,
  useLocalTracks,
  useScreenShare,
} from '@/components/call/LiveKitRoom';
import {
  useCallStore,
  useCurrentCall,
  useCallUIState,
  useLocalParticipant as useLocalParticipantStore,
  useCallDuration,
  useLiveKitConfig,
  useNetworkQuality,
} from '@/stores/call';
import { CallType } from '@/types/call';
import { colors } from '@/constants/theme';
import { callSignalingService } from '@/services/callSignaling';

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type LayoutMode = 'grid' | 'speaker';

// =============================================================================
// CALL SCREEN CONTENT (Inside LiveKit Context)
// =============================================================================

function CallScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Call state from store
  const uiState = useCallUIState();
  const currentCall = useCurrentCall();

  // Keep screen awake only for video calls
  // For voice calls, let OS/CallKit handle proximity sensor (screen off when near ear)
  const isVideoCall = currentCall?.call_type === CallType.VIDEO;
  useKeepAwake(isVideoCall ? 'video-call' : undefined);
  const localParticipantState = useLocalParticipantStore();
  const callDuration = useCallDuration();
  const networkQuality = useNetworkQuality();

  // LiveKit hooks
  const connectionState = useConnectionState();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const { toggleMicrophone, toggleCamera, switchCamera, isMicrophoneEnabled, isCameraEnabled } = useLocalTracks();
  const { isScreenSharing, toggleScreenShare } = useScreenShare();

  // Local state
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('speaker');

  // Store actions
  const {
    cancelCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
  } = useCallStore();

  // Filter remote participants
  const remoteParticipants = useMemo(() => {
    return participants.filter(p => p !== localParticipant);
  }, [participants, localParticipant]);

  // Handle back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (uiState === 'active' || uiState === 'connecting') {
        return true; // Prevent back
      }
      return false;
    });

    return () => backHandler.remove();
  }, [uiState]);

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

  // Lock orientation for video calls
  useEffect(() => {
    if (isVideoCall && uiState === 'active') {
      ScreenOrientation.unlockAsync();
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }

    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, [isVideoCall, uiState]);

  // Get the other participant's info
  const getOtherParticipantInfo = useCallback(() => {
    if (!currentCall) return { name: 'Unknown', avatar: null };

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

  // Handle mute toggle (sync with LiveKit)
  const handleToggleMute = async () => {
    toggleMute();
    await toggleMicrophone();
  };

  // Handle video toggle (sync with LiveKit)
  const handleToggleVideo = async () => {
    toggleVideo();
    await toggleCamera();
  };

  // Handle layout change
  const handleLayoutChange = () => {
    const modes: LayoutMode[] = ['speaker', 'grid'];
    const currentIndex = modes.indexOf(layoutMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setLayoutMode(modes[nextIndex]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Render network quality icon
  const renderNetworkQuality = () => {
    const quality = networkQuality.level;
    const iconSize = 18;

    if (quality === 'excellent' || quality === 'good') {
      return <Wifi size={iconSize} color={colors.success[500]} />;
    } else if (quality === 'fair') {
      return <Wifi size={iconSize} color={colors.warning[500]} />;
    } else if (quality === 'poor') {
      return <WifiOff size={iconSize} color={colors.error[500]} />;
    }
    return <Signal size={iconSize} color={colors.gray[400]} />;
  };

  // Render video grid for group calls
  const renderVideoGrid = () => {
    const totalParticipants = participants.length;

    if (totalParticipants === 0) {
      return (
        <View style={styles.noParticipants}>
          <CallerInfo
            name={otherParticipant.name}
            avatar={otherParticipant.avatar}
            uiState={uiState}
            duration={callDuration}
          />
        </View>
      );
    }

    if (totalParticipants === 1 && localParticipant) {
      // Just local participant (waiting for others)
      return (
        <View style={styles.singleParticipant}>
          <CallerInfo
            name={otherParticipant.name}
            avatar={otherParticipant.avatar}
            uiState={uiState === 'active' ? 'connecting' : uiState}
            duration={callDuration}
          />
        </View>
      );
    }

    if (totalParticipants === 2 && layoutMode === 'speaker') {
      // 1:1 call - speaker view
      return (
        <View style={styles.speakerLayout}>
          {/* Remote participant (full screen) */}
          {remoteParticipants[0] && (
            <ParticipantTile
              participant={remoteParticipants[0]}
              style={styles.fullScreenParticipant}
              showName={true}
            />
          )}

          {/* Local participant (small overlay) */}
          {localParticipant && isCameraEnabled && (
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={[styles.localVideoOverlay, { top: insets.top + 60 }]}
            >
              <ParticipantTile
                participant={localParticipant}
                isLocal={true}
                style={styles.localVideo}
                showName={false}
              />
            </MotiView>
          )}
        </View>
      );
    }

    // Grid layout for 2+ participants
    const columns = totalParticipants <= 2 ? 1 : 2;
    const rows = Math.ceil(totalParticipants / columns);

    return (
      <View style={styles.gridLayout}>
        {participants.map((participant) => (
          <View
            key={participant.identity}
            style={[
              styles.gridTile,
              {
                width: SCREEN_WIDTH / columns - 4,
                height: (SCREEN_HEIGHT - 200) / rows - 4,
              },
            ]}
          >
            <ParticipantTile
              participant={participant}
              isLocal={participant === localParticipant}
              showName={true}
            />
          </View>
        ))}
      </View>
    );
  };

  // Don't render if no current call
  if (!currentCall && uiState === 'idle') {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={
          isVideoCall
            ? ['#1a1a1a', '#2d2d2d', '#1a1a1a']
            : ['#1a1a2e', '#16213e', '#0f3460']
        }
        style={styles.gradient}
      >
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <HStack space="md" style={styles.topBarContent}>
            {/* Network quality */}
            <View style={styles.networkContainer}>
              {renderNetworkQuality()}
            </View>

            {/* Call duration */}
            {uiState === 'active' && (
              <Text style={styles.duration}>{callDuration.formatted}</Text>
            )}

            {/* Connection status */}
            {connectionState === ConnectionState.Reconnecting && (
              <Text style={styles.reconnecting}>Reconnecting...</Text>
            )}

            {/* Layout toggle (video calls only) */}
            {isVideoCall && remoteParticipants.length > 0 && (
              <Pressable onPress={handleLayoutChange} style={styles.layoutButton}>
                <Grid size={20} color={colors.white} />
              </Pressable>
            )}

            {/* Screen share toggle (video calls, Android only) */}
            {isVideoCall && Platform.OS === 'android' && (
              <Pressable onPress={toggleScreenShare} style={styles.layoutButton}>
                {isScreenSharing ? (
                  <ScreenShareOff size={20} color={colors.error[500]} />
                ) : (
                  <ScreenShare size={20} color={colors.white} />
                )}
              </Pressable>
            )}
          </HStack>
        </View>

        {/* Main content */}
        {isVideoCall && uiState === 'active' ? (
          renderVideoGrid()
        ) : (
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
          <MotiView
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={styles.endedOverlay}
          >
            <Text style={styles.endedText}>Call Ended</Text>
            <Text style={styles.endedDuration}>
              Duration: {callDuration.formatted}
            </Text>
          </MotiView>
        )}

        {/* Call Controls */}
        {uiState !== 'ended' && (
          <CallControls
            callType={currentCall?.call_type || CallType.VOICE}
            isMuted={!isMicrophoneEnabled}
            isVideoEnabled={isCameraEnabled}
            isSpeakerOn={localParticipantState.isSpeakerOn}
            onToggleMute={handleToggleMute}
            onToggleVideo={handleToggleVideo}
            onToggleSpeaker={toggleSpeaker}
            onSwitchCamera={switchCamera}
            onEndCall={handleEndCall}
          />
        )}
      </LinearGradient>
    </View>
  );
}

// =============================================================================
// MAIN CALL SCREEN
// =============================================================================

export default function CallScreen() {
  const { id: callId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Call state from store
  const uiState = useCallUIState();
  const currentCall = useCurrentCall();
  const livekitConfig = useLiveKitConfig();

  // Subscribe to call topics when entering call
  useEffect(() => {
    if (currentCall?.call_id) {
      callSignalingService.subscribeToCallTopics(currentCall.call_id);
    }

    return () => {
      callSignalingService.unsubscribeFromCallTopics();
    };
  }, [currentCall?.call_id]);

  // Handle connection errors
  const handleError = useCallback((error: Error) => {
    console.error('[CallScreen] LiveKit error:', error);
  }, []);

  // Handle disconnection
  const handleDisconnected = useCallback(() => {
    console.log('[CallScreen] Disconnected from LiveKit');
  }, []);

  // Don't render if no LiveKit config
  if (!livekitConfig || !currentCall) {
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
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            style={styles.gradient}
          >
            <View style={styles.loadingContent}>
              <Text style={styles.loadingText}>Connecting...</Text>
            </View>
          </LinearGradient>
        </View>
      </>
    );
  }

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

      <LiveKitRoom
        url={livekitConfig.url}
        token={livekitConfig.token}
        callType={currentCall.call_type}
        callId={currentCall.call_id}
        onError={handleError}
        onDisconnected={handleDisconnected}
      >
        <CallScreenContent />
      </LiveKitRoom>
    </>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.white,
    fontSize: 18,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  topBarContent: {
    alignItems: 'center',
  },
  networkContainer: {
    padding: 4,
  },
  duration: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  reconnecting: {
    color: colors.warning[400],
    fontSize: 14,
  },
  layoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  voiceCallContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  noParticipants: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleParticipant: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakerLayout: {
    flex: 1,
    position: 'relative',
  },
  fullScreenParticipant: {
    flex: 1,
    borderRadius: 0,
  },
  localVideoOverlay: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
  },
  localVideo: {
    width: 100,
    height: 140,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  gridLayout: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
    alignContent: 'center',
    justifyContent: 'center',
  },
  gridTile: {
    margin: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  endedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
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
