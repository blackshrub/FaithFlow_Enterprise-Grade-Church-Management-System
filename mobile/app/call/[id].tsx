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
  BackHandler,
  StatusBar,
  Dimensions,
  Pressable,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';

// Check if we're in Expo Go (no native modules available)
const isExpoGo = Constants.appOwnership === 'expo';

// Conditionally import LiveKit - only works in dev builds
let useParticipants: any;
let useConnectionState: any;
let useLocalParticipant: any;
let ConnectionState: any;
let Track: any;
let ConnectionQuality: any;

if (!isExpoGo) {
  try {
    const livekit = require('@livekit/react-native');
    const livekitClient = require('livekit-client');
    useParticipants = livekit.useParticipants;
    useConnectionState = livekit.useConnectionState;
    useLocalParticipant = livekit.useLocalParticipant;
    ConnectionState = livekitClient.ConnectionState;
    Track = livekitClient.Track;
    ConnectionQuality = livekitClient.ConnectionQuality;
  } catch (e) {
    console.warn('LiveKit not available:', e);
  }
}
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

// Conditionally import LiveKitRoom - only works in dev builds
let LiveKitRoom: any;
let ParticipantTile: any;
let useLocalTracks: any;
let useScreenShare: any;

if (!isExpoGo) {
  try {
    const lkRoom = require('@/components/call/LiveKitRoom');
    LiveKitRoom = lkRoom.LiveKitRoom;
    ParticipantTile = lkRoom.ParticipantTile;
    useLocalTracks = lkRoom.useLocalTracks;
    useScreenShare = lkRoom.useScreenShare;
  } catch (e) {
    console.warn('LiveKitRoom not available:', e);
  }
}
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
    return participants.filter((p: any) => p !== localParticipant);
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
        <View className="flex-1 justify-center items-center">
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
        <View className="flex-1 justify-center items-center">
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
        <View className="flex-1 relative">
          {/* Remote participant (full screen) */}
          {remoteParticipants[0] && (
            <ParticipantTile
              participant={remoteParticipants[0]}
              style={{ flex: 1, borderRadius: 0 }}
              showName={true}
            />
          )}

          {/* Local participant (small overlay) */}
          {localParticipant && isCameraEnabled && (
            <Animated.View
              entering={ZoomIn.springify()}
              className="absolute right-5 z-10"
              style={{ top: insets.top + 60 }}
            >
              <ParticipantTile
                participant={localParticipant}
                isLocal={true}
                style={{
                  width: 100,
                  height: 140,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                }}
                showName={false}
              />
            </Animated.View>
          )}
        </View>
      );
    }

    // Grid layout for 2+ participants
    const columns = totalParticipants <= 2 ? 1 : 2;
    const rows = Math.ceil(totalParticipants / columns);

    return (
      <View className="flex-1 flex-row flex-wrap justify-center content-center p-0.5">
        {participants.map((participant: any) => (
          <View
            key={participant.identity}
            className="m-0.5 rounded-xl overflow-hidden"
            style={{
              width: SCREEN_WIDTH / columns - 4,
              height: (SCREEN_HEIGHT - 200) / rows - 4,
            }}
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
    <View className="flex-1 bg-black">
      <LinearGradient
        colors={
          isVideoCall
            ? ['#1a1a1a', '#2d2d2d', '#1a1a1a']
            : ['#1a1a2e', '#16213e', '#0f3460']
        }
        className="flex-1"
      >
        {/* Top bar */}
        <View
          className="absolute top-0 left-0 right-0 z-10 px-5 pb-2.5"
          style={{ paddingTop: insets.top + 10 }}
        >
          <HStack space="md" className="items-center">
            {/* Network quality */}
            <View className="p-1">
              {renderNetworkQuality()}
            </View>

            {/* Call duration */}
            {uiState === 'active' && (
              <Text className="text-base font-semibold text-white">{callDuration.formatted}</Text>
            )}

            {/* Connection status */}
            {connectionState === ConnectionState.Reconnecting && (
              <Text className="text-sm" style={{ color: colors.warning[400] }}>Reconnecting...</Text>
            )}

            {/* Layout toggle (video calls only) */}
            {isVideoCall && remoteParticipants.length > 0 && (
              <Pressable
                onPress={handleLayoutChange}
                className="p-2 rounded-full"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Grid size={20} color={colors.white} />
              </Pressable>
            )}

            {/* Screen share toggle (video calls, Android only) */}
            {isVideoCall && Platform.OS === 'android' && (
              <Pressable
                onPress={toggleScreenShare}
                className="p-2 rounded-full"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
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
          <View className="flex-1 justify-center items-center pb-[100px]">
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
          <Animated.View
            entering={FadeIn.duration(300)}
            className="absolute inset-0 items-center justify-center z-[100]"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          >
            <Text className="text-white text-[28px] font-bold mb-2">Call Ended</Text>
            <Text className="text-lg" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Duration: {callDuration.formatted}
            </Text>
          </Animated.View>
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
  const insets = useSafeAreaInsets();

  // Show placeholder in Expo Go (LiveKit requires native modules)
  if (isExpoGo) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: false,
            animation: 'fade',
          }}
        />
        <StatusBar barStyle="light-content" />
        <View className="flex-1 bg-black">
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            className="flex-1"
          >
            <View className="flex-1 justify-center items-center px-10">
              <Text className="text-white text-2xl font-bold mb-4 text-center">
                Calling Not Available
              </Text>
              <Text className="text-base text-center mb-8" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Voice/video calls require a development build. They are not supported in Expo Go.
              </Text>
              <Pressable
                onPress={() => router.back()}
                className="rounded-xl px-8 py-4"
                style={{ backgroundColor: colors.primary[500] }}
              >
                <Text className="text-white text-base font-semibold">Go Back</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </>
    );
  }

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
    // Disconnected from LiveKit - no-op, cleanup handled elsewhere
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
        <View className="flex-1 bg-black">
          <LinearGradient
            colors={['#1a1a2e', '#16213e', '#0f3460']}
            className="flex-1"
          >
            <View className="flex-1 items-center justify-center">
              <Text className="text-white text-lg">Connecting...</Text>
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

