/**
 * CallKit Service (iOS) / ConnectionService (Android)
 *
 * Native call integration for:
 * - iOS: CallKit (shows calls on lock screen, integrates with Phone app)
 * - Android: ConnectionService (system call UI, telecom integration)
 *
 * Uses react-native-callkeep for cross-platform implementation.
 */

import { Platform, AppState, AppStateStatus } from 'react-native';
import RNCallKeep, { IOptions } from 'react-native-callkeep';
import { useCallStore } from '@/stores/call';
import { CallType, CallInviteSignal } from '@/types/call';

// =============================================================================
// CONFIGURATION
// =============================================================================

const CALLKEEP_OPTIONS: IOptions = {
  ios: {
    appName: 'FaithFlow',
    supportsVideo: true,
    maximumCallGroups: '1',
    maximumCallsPerCallGroup: '1',
    includesCallsInRecents: true,
    // ringtoneSound: 'ringtone.mp3', // Custom ringtone in iOS bundle
  },
  android: {
    alertTitle: 'Permissions Required',
    alertDescription: 'FaithFlow needs access to display call notifications',
    cancelButton: 'Cancel',
    okButton: 'OK',
    imageName: 'ic_launcher',
    additionalPermissions: [],
    // Self managed calls (required for custom UI)
    selfManaged: true,
    // Foreground service notification
    foregroundService: {
      channelId: 'com.faithflow.calls',
      channelName: 'Call Notifications',
      notificationTitle: 'FaithFlow Call',
      notificationIcon: 'ic_launcher',
    },
  },
};

// =============================================================================
// CALLKIT SERVICE
// =============================================================================

class CallKitService {
  private isSetup = false;
  private activeCallUUID: string | null = null;

  /**
   * Initialize CallKit/ConnectionService
   */
  async setup(): Promise<boolean> {
    if (this.isSetup) {
      return true;
    }

    try {
      // Setup CallKeep
      await RNCallKeep.setup(CALLKEEP_OPTIONS);

      // Register event handlers
      this.registerEventHandlers();

      // Check/request permissions (Android)
      if (Platform.OS === 'android') {
        const hasPermission = await RNCallKeep.hasPhoneAccount();
        if (!hasPermission) {
          await RNCallKeep.registerPhoneAccount(CALLKEEP_OPTIONS);
          await RNCallKeep.registerAndroidEvents();
        }
      }

      this.isSetup = true;
      console.log('[CallKit] Setup complete');
      return true;
    } catch (error) {
      console.error('[CallKit] Setup failed:', error);
      return false;
    }
  }

  /**
   * Register CallKeep event handlers
   */
  private registerEventHandlers(): void {
    // Answer call from native UI
    RNCallKeep.addEventListener('answerCall', this.handleAnswerCall);

    // End call from native UI
    RNCallKeep.addEventListener('endCall', this.handleEndCall);

    // Audio session activated (iOS)
    RNCallKeep.addEventListener('didActivateAudioSession', this.handleAudioActivated);

    // Call toggled hold
    RNCallKeep.addEventListener('didToggleHoldCallAction', this.handleToggleHold);

    // DTMF (dial tones)
    RNCallKeep.addEventListener('didPerformDTMFAction', this.handleDTMF);

    // Mute toggled
    RNCallKeep.addEventListener('didPerformSetMutedCallAction', this.handleMuteToggle);

    // Check reachability
    RNCallKeep.addEventListener('checkReachability', this.handleCheckReachability);

    console.log('[CallKit] Event handlers registered');
  }

  /**
   * Display incoming call
   */
  displayIncomingCall(
    callId: string,
    callerName: string,
    callerNumber: string,
    hasVideo: boolean = false
  ): void {
    try {
      // Generate UUID for this call
      const uuid = callId; // Use call_id as UUID
      this.activeCallUUID = uuid;

      RNCallKeep.displayIncomingCall(
        uuid,
        callerNumber || 'FaithFlow',
        callerName,
        'generic', // handle type
        hasVideo
      );

      console.log('[CallKit] Displayed incoming call:', callerName);
    } catch (error) {
      console.error('[CallKit] Failed to display incoming call:', error);
    }
  }

  /**
   * Start outgoing call
   */
  startCall(
    callId: string,
    calleeName: string,
    calleeNumber: string,
    hasVideo: boolean = false
  ): void {
    try {
      const uuid = callId;
      this.activeCallUUID = uuid;

      RNCallKeep.startCall(
        uuid,
        calleeNumber || 'FaithFlow',
        calleeName,
        'generic',
        hasVideo
      );

      console.log('[CallKit] Started outgoing call:', calleeName);
    } catch (error) {
      console.error('[CallKit] Failed to start call:', error);
    }
  }

  /**
   * Report call connected
   */
  reportCallConnected(callId: string): void {
    try {
      const uuid = callId;
      RNCallKeep.setCurrentCallActive(uuid);
      console.log('[CallKit] Call connected:', callId);
    } catch (error) {
      console.error('[CallKit] Failed to report call connected:', error);
    }
  }

  /**
   * End call
   */
  endCall(callId: string): void {
    try {
      const uuid = callId;
      RNCallKeep.endCall(uuid);
      this.activeCallUUID = null;
      console.log('[CallKit] Ended call:', callId);
    } catch (error) {
      console.error('[CallKit] Failed to end call:', error);
    }
  }

  /**
   * Report call ended
   */
  reportEndCall(callId: string, reason: number = 1): void {
    try {
      const uuid = callId;
      // Reasons: 1=failed, 2=remote ended, 3=unanswered, 4=answered elsewhere, 5=declined elsewhere, 6=missed
      RNCallKeep.reportEndCallWithUUID(uuid, reason);
      this.activeCallUUID = null;
      console.log('[CallKit] Reported call ended:', callId, 'reason:', reason);
    } catch (error) {
      console.error('[CallKit] Failed to report call ended:', error);
    }
  }

  /**
   * Update call display name
   */
  updateDisplay(callId: string, callerName: string, callerNumber: string): void {
    try {
      RNCallKeep.updateDisplay(callId, callerName, callerNumber || 'FaithFlow');
    } catch (error) {
      console.error('[CallKit] Failed to update display:', error);
    }
  }

  /**
   * Set call on hold
   */
  setOnHold(callId: string, hold: boolean): void {
    try {
      RNCallKeep.setOnHold(callId, hold);
    } catch (error) {
      console.error('[CallKit] Failed to set on hold:', error);
    }
  }

  /**
   * Set muted
   */
  setMuted(callId: string, muted: boolean): void {
    try {
      RNCallKeep.setMutedCall(callId, muted);
    } catch (error) {
      console.error('[CallKit] Failed to set muted:', error);
    }
  }

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================

  private handleAnswerCall = ({ callUUID }: { callUUID: string }) => {
    console.log('[CallKit] Answer call:', callUUID);

    // Accept call through our call store
    const { acceptCall, incomingCall } = useCallStore.getState();
    if (incomingCall && incomingCall.call_id === callUUID) {
      acceptCall(callUUID).catch(console.error);
    }
  };

  private handleEndCall = ({ callUUID }: { callUUID: string }) => {
    console.log('[CallKit] End call:', callUUID);

    // End or reject call through our call store
    const { endCall, rejectCall, currentCall, incomingCall, uiState } = useCallStore.getState();

    if (uiState === 'incoming' && incomingCall?.call_id === callUUID) {
      rejectCall(callUUID, 'rejected').catch(console.error);
    } else if (currentCall?.call_id === callUUID) {
      endCall('normal').catch(console.error);
    }
  };

  private handleAudioActivated = () => {
    console.log('[CallKit] Audio session activated');
    // Audio session is ready - LiveKit will handle the actual audio
  };

  private handleToggleHold = ({ callUUID, hold }: { callUUID: string; hold: boolean }) => {
    console.log('[CallKit] Toggle hold:', callUUID, hold);
    // We don't support hold currently
  };

  private handleDTMF = ({ callUUID, digits }: { callUUID: string; digits: string }) => {
    console.log('[CallKit] DTMF:', callUUID, digits);
    // We don't need DTMF for VoIP calls
  };

  private handleMuteToggle = ({ callUUID, muted }: { callUUID: string; muted: boolean }) => {
    console.log('[CallKit] Mute toggle:', callUUID, muted);

    // Update mute state in our store
    const { toggleMute, localParticipant } = useCallStore.getState();
    if (localParticipant.isMuted !== muted) {
      toggleMute();
    }
  };

  private handleCheckReachability = () => {
    // Report that we're reachable
    RNCallKeep.setReachable();
  };

  // =========================================================================
  // CLEANUP
  // =========================================================================

  /**
   * Remove all event listeners
   */
  cleanup(): void {
    RNCallKeep.removeEventListener('answerCall');
    RNCallKeep.removeEventListener('endCall');
    RNCallKeep.removeEventListener('didActivateAudioSession');
    RNCallKeep.removeEventListener('didToggleHoldCallAction');
    RNCallKeep.removeEventListener('didPerformDTMFAction');
    RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
    RNCallKeep.removeEventListener('checkReachability');

    this.isSetup = false;
    this.activeCallUUID = null;
    console.log('[CallKit] Cleaned up');
  }

  /**
   * Check if CallKit is available
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  /**
   * Get active call UUID
   */
  getActiveCallUUID(): string | null {
    return this.activeCallUUID;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const callKitService = new CallKitService();

// =============================================================================
// HELPER FUNCTION
// =============================================================================

/**
 * Display incoming call on native UI
 * Call this when receiving an incoming call signal
 */
export function showIncomingCall(signal: CallInviteSignal): void {
  callKitService.displayIncomingCall(
    signal.call_id,
    signal.caller.name,
    signal.caller.id,
    signal.call_type === CallType.VIDEO
  );
}

/**
 * Start outgoing call on native UI
 */
export function startOutgoingCall(
  callId: string,
  calleeName: string,
  calleeId: string,
  isVideo: boolean
): void {
  callKitService.startCall(callId, calleeName, calleeId, isVideo);
}

export default callKitService;
