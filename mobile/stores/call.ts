/**
 * Call Store
 *
 * Zustand store for managing voice/video call state.
 * Handles call lifecycle, participant management, and UI state.
 */

import { create } from 'zustand';
import * as Haptics from 'expo-haptics';

import {
  CallUIState,
  CallType,
  CallDuration,
  NetworkQuality,
  LiveKitConfig,
  LocalParticipantState,
  RemoteParticipantState,
  ActiveCallInfo,
  CallInviteSignal,
  CallAcceptSignal,
  CallRejectSignal,
  CallCancelSignal,
  CallEndSignal,
  ParticipantJoinedSignal,
  ParticipantLeftSignal,
  ParticipantMutedSignal,
  ParticipantVideoSignal,
  CallStore,
} from '@/types/call';
import { callApi } from '@/services/api/call';

// =============================================================================
// Initial State
// =============================================================================

const initialLocalParticipant: LocalParticipantState = {
  isMuted: false,
  isVideoEnabled: true,
  isSpeakerOn: false,
  isScreenSharing: false,
};

const initialDuration: CallDuration = {
  hours: 0,
  minutes: 0,
  seconds: 0,
  formatted: '00:00',
};

const initialNetworkQuality: NetworkQuality = {
  level: 'unknown',
};

// =============================================================================
// Helper Functions
// =============================================================================

function formatDuration(totalSeconds: number): CallDuration {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted = hours > 0
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return { hours, minutes, seconds, formatted };
}

// =============================================================================
// Store
// =============================================================================

let durationInterval: ReturnType<typeof setInterval> | null = null;

export const useCallStore = create<CallStore>((set, get) => ({
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  uiState: 'idle',
  currentCall: null,
  incomingCall: null,
  livekitConfig: null,
  isConnected: false,
  localParticipant: initialLocalParticipant,
  remoteParticipants: new Map(),
  callStartTime: null,
  callDuration: initialDuration,
  networkQuality: initialNetworkQuality,
  error: null,

  // ---------------------------------------------------------------------------
  // Call Lifecycle Actions
  // ---------------------------------------------------------------------------

  initiateCall: async (callee_ids: string[], call_type: CallType, community_id?: string) => {
    try {
      set({ uiState: 'outgoing', error: null });

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Call API to initiate
      const response = await callApi.initiateCall({
        callee_ids,
        call_type,
        community_id,
      });

      // Update state with call info
      set({
        currentCall: {
          call_id: response.call_id,
          room_name: response.room_name,
          call_type: response.call_type,
          status: 'ringing' as any,
          participants: response.participants,
          started_at: new Date().toISOString(),
          duration_seconds: 0,
        },
        livekitConfig: {
          url: response.livekit_url,
          token: response.livekit_token,
          roomName: response.room_name,
        },
        localParticipant: {
          ...initialLocalParticipant,
          isVideoEnabled: call_type === CallType.VIDEO,
        },
      });

    } catch (error: any) {
      console.error('Failed to initiate call:', error);
      set({
        uiState: 'idle',
        error: error.message || 'Failed to initiate call',
      });
      throw error;
    }
  },

  acceptCall: async (call_id: string) => {
    try {
      set({ uiState: 'connecting', error: null });

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Call API to accept
      const response = await callApi.acceptCall(call_id);

      // Update state
      const { incomingCall } = get();

      set({
        currentCall: {
          call_id: response.call_id,
          room_name: response.room_name,
          call_type: response.call_type,
          status: 'connecting' as any,
          participants: response.participants,
          started_at: new Date().toISOString(),
          duration_seconds: 0,
        },
        livekitConfig: {
          url: response.livekit_url,
          token: response.livekit_token,
          roomName: response.room_name,
        },
        localParticipant: {
          ...initialLocalParticipant,
          isVideoEnabled: response.call_type === CallType.VIDEO,
        },
        incomingCall: null,
      });

    } catch (error: any) {
      console.error('Failed to accept call:', error);
      set({
        uiState: 'idle',
        incomingCall: null,
        error: error.message || 'Failed to accept call',
      });
      throw error;
    }
  },

  rejectCall: async (call_id: string, reason = 'rejected') => {
    try {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Call API to reject
      await callApi.rejectCall(call_id, { reason });

      // Reset state
      set({
        uiState: 'idle',
        incomingCall: null,
      });

    } catch (error: any) {
      console.error('Failed to reject call:', error);
      // Still reset state even on error
      set({
        uiState: 'idle',
        incomingCall: null,
      });
    }
  },

  cancelCall: async () => {
    const { currentCall } = get();

    if (!currentCall) return;

    try {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Call API to cancel
      await callApi.cancelCall(currentCall.call_id);

      // Reset state
      get().reset();

    } catch (error: any) {
      console.error('Failed to cancel call:', error);
      // Still reset state even on error
      get().reset();
    }
  },

  endCall: async (reason = 'normal') => {
    const { currentCall, stopDurationTimer } = get();

    if (!currentCall) return;

    try {
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Stop duration timer
      stopDurationTimer();

      // Call API to end
      await callApi.endCall(currentCall.call_id, { reason });

      // Set ended state briefly before resetting
      set({ uiState: 'ended' });

      // Reset after brief delay
      setTimeout(() => {
        get().reset();
      }, 1500);

    } catch (error: any) {
      console.error('Failed to end call:', error);
      // Still reset state even on error
      get().reset();
    }
  },

  // ---------------------------------------------------------------------------
  // Incoming Call Handling
  // ---------------------------------------------------------------------------

  handleIncomingCall: (signal: CallInviteSignal) => {
    // Don't handle if already in a call
    const { uiState } = get();
    if (uiState !== 'idle') {
      console.log('Ignoring incoming call - already in call');
      return;
    }

    // Haptic feedback for incoming call
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    set({
      uiState: 'incoming',
      incomingCall: signal,
    });
  },

  handleCallCancelled: (signal: CallCancelSignal) => {
    const { incomingCall, currentCall } = get();

    // Check if this is for our incoming call
    if (incomingCall?.call_id === signal.call_id) {
      set({
        uiState: 'idle',
        incomingCall: null,
      });
      return;
    }

    // Check if this is for our current call
    if (currentCall?.call_id === signal.call_id) {
      get().stopDurationTimer();
      set({ uiState: 'ended' });

      setTimeout(() => {
        get().reset();
      }, 1500);
    }
  },

  // ---------------------------------------------------------------------------
  // Signal Handling
  // ---------------------------------------------------------------------------

  handleCallAccepted: (signal: CallAcceptSignal) => {
    const { currentCall } = get();

    if (!currentCall || currentCall.call_id !== signal.call_id) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    set({
      uiState: 'connecting',
      currentCall: {
        ...currentCall,
        status: 'connecting' as any,
      },
    });
  },

  handleCallRejected: (signal: CallRejectSignal) => {
    const { currentCall } = get();

    if (!currentCall || currentCall.call_id !== signal.call_id) return;

    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    // For single callee calls, end the call
    // For group calls, remove the participant
    const remainingCallees = currentCall.participants.filter(
      p => p.member_id !== signal.callee_id && p.role === 'callee'
    );

    if (remainingCallees.length === 0) {
      set({ uiState: 'ended' });

      setTimeout(() => {
        get().reset();
      }, 2000);
    } else {
      // Remove rejected callee from participants
      set({
        currentCall: {
          ...currentCall,
          participants: currentCall.participants.filter(
            p => p.member_id !== signal.callee_id
          ),
        },
      });
    }
  },

  handleCallEnded: (signal: CallEndSignal) => {
    const { currentCall, stopDurationTimer } = get();

    if (!currentCall || currentCall.call_id !== signal.call_id) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    stopDurationTimer();

    set({
      uiState: 'ended',
      callDuration: formatDuration(signal.duration_seconds),
    });

    setTimeout(() => {
      get().reset();
    }, 2000);
  },

  handleParticipantJoined: (signal: ParticipantJoinedSignal) => {
    const { currentCall, remoteParticipants, startDurationTimer, uiState } = get();

    if (!currentCall || currentCall.call_id !== signal.call_id) return;

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add to remote participants
    const newParticipants = new Map(remoteParticipants);
    newParticipants.set(signal.participant.id, {
      participantId: signal.participant.id,
      name: signal.participant.name,
      avatar: signal.participant.avatar ?? undefined,
      isMuted: false,
      isVideoEnabled: currentCall.call_type === CallType.VIDEO,
      isSpeaking: false,
      networkQuality: { level: 'unknown' },
    });

    // If we're connecting and someone joined, call is now active
    const newUiState = uiState === 'connecting' ? 'active' : uiState;

    set({
      uiState: newUiState,
      remoteParticipants: newParticipants,
      currentCall: {
        ...currentCall,
        status: newUiState === 'active' ? 'active' as any : currentCall.status,
      },
    });

    // Start duration timer when call becomes active
    if (newUiState === 'active' && uiState !== 'active') {
      startDurationTimer();
    }
  },

  handleParticipantLeft: (signal: ParticipantLeftSignal) => {
    const { currentCall, remoteParticipants } = get();

    if (!currentCall || currentCall.call_id !== signal.call_id) return;

    // Remove from remote participants
    const newParticipants = new Map(remoteParticipants);
    newParticipants.delete(signal.participant_id);

    set({ remoteParticipants: newParticipants });

    // If all remote participants left, end the call
    if (newParticipants.size === 0) {
      get().endCall('normal');
    }
  },

  handleParticipantMuted: (signal: ParticipantMutedSignal) => {
    const { currentCall, remoteParticipants } = get();

    if (!currentCall || currentCall.call_id !== signal.call_id) return;

    const participant = remoteParticipants.get(signal.participant_id);
    if (!participant) return;

    const newParticipants = new Map(remoteParticipants);
    newParticipants.set(signal.participant_id, {
      ...participant,
      isMuted: signal.is_muted,
    });

    set({ remoteParticipants: newParticipants });
  },

  handleParticipantVideo: (signal: ParticipantVideoSignal) => {
    const { currentCall, remoteParticipants } = get();

    if (!currentCall || currentCall.call_id !== signal.call_id) return;

    const participant = remoteParticipants.get(signal.participant_id);
    if (!participant) return;

    const newParticipants = new Map(remoteParticipants);
    newParticipants.set(signal.participant_id, {
      ...participant,
      isVideoEnabled: signal.is_video_enabled,
    });

    set({ remoteParticipants: newParticipants });
  },

  // ---------------------------------------------------------------------------
  // Local Controls
  // ---------------------------------------------------------------------------

  toggleMute: () => {
    const { localParticipant, currentCall } = get();

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMutedState = !localParticipant.isMuted;

    set({
      localParticipant: {
        ...localParticipant,
        isMuted: newMutedState,
      },
    });

    // Notify server
    if (currentCall) {
      callApi.updateParticipant(currentCall.call_id, {
        is_muted: newMutedState,
      }).catch(console.error);
    }
  },

  toggleVideo: () => {
    const { localParticipant, currentCall } = get();

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newVideoState = !localParticipant.isVideoEnabled;

    set({
      localParticipant: {
        ...localParticipant,
        isVideoEnabled: newVideoState,
      },
    });

    // Notify server
    if (currentCall) {
      callApi.updateParticipant(currentCall.call_id, {
        is_video_enabled: newVideoState,
      }).catch(console.error);
    }
  },

  toggleSpeaker: () => {
    const { localParticipant, currentCall } = get();

    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newSpeakerState = !localParticipant.isSpeakerOn;

    set({
      localParticipant: {
        ...localParticipant,
        isSpeakerOn: newSpeakerState,
      },
    });

    // Notify server
    if (currentCall) {
      callApi.updateParticipant(currentCall.call_id, {
        is_speaker_on: newSpeakerState,
      }).catch(console.error);
    }
  },

  switchCamera: () => {
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Camera switching is handled by LiveKit SDK directly
    // This is just for state tracking if needed
  },

  // ---------------------------------------------------------------------------
  // Duration Timer
  // ---------------------------------------------------------------------------

  startDurationTimer: () => {
    // Clear existing interval
    if (durationInterval) {
      clearInterval(durationInterval);
    }

    set({
      callStartTime: new Date(),
      callDuration: initialDuration,
    });

    durationInterval = setInterval(() => {
      const { callStartTime } = get();
      if (!callStartTime) return;

      const totalSeconds = Math.floor((Date.now() - callStartTime.getTime()) / 1000);
      set({ callDuration: formatDuration(totalSeconds) });
    }, 1000);
  },

  stopDurationTimer: () => {
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }
  },

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset: () => {
    // Stop duration timer
    if (durationInterval) {
      clearInterval(durationInterval);
      durationInterval = null;
    }

    set({
      uiState: 'idle',
      currentCall: null,
      incomingCall: null,
      livekitConfig: null,
      isConnected: false,
      localParticipant: initialLocalParticipant,
      remoteParticipants: new Map(),
      callStartTime: null,
      callDuration: initialDuration,
      networkQuality: initialNetworkQuality,
      error: null,
    });
  },
}));

// =============================================================================
// Selectors (for performance optimization)
// =============================================================================

export const useCallUIState = () => useCallStore(state => state.uiState);
export const useCurrentCall = () => useCallStore(state => state.currentCall);
export const useIncomingCall = () => useCallStore(state => state.incomingCall);
export const useLocalParticipant = () => useCallStore(state => state.localParticipant);
export const useRemoteParticipants = () => useCallStore(state => state.remoteParticipants);
export const useCallDuration = () => useCallStore(state => state.callDuration);
export const useNetworkQuality = () => useCallStore(state => state.networkQuality);
export const useLiveKitConfig = () => useCallStore(state => state.livekitConfig);

// =============================================================================
// Utility Hooks
// =============================================================================

export const useIsInCall = () => {
  const uiState = useCallUIState();
  return ['outgoing', 'incoming', 'connecting', 'active', 'reconnecting'].includes(uiState);
};

export const useIsCallActive = () => {
  const uiState = useCallUIState();
  return uiState === 'active';
};

export const useCanToggleVideo = () => {
  const currentCall = useCurrentCall();
  return currentCall?.call_type === CallType.VIDEO;
};
