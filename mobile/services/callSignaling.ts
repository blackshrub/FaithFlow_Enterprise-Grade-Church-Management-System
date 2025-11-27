/**
 * Call Signaling Service
 *
 * Handles MQTT-based call signaling for voice/video calls.
 * Subscribes to call-related topics and dispatches signals to the call store.
 *
 * Topics:
 * - faithflow/{church_id}/member/{member_id}/incoming_call - Incoming call invitations
 * - faithflow/{church_id}/member/{member_id}/call_status - Call status updates
 * - faithflow/{church_id}/call/{call_id}/signal - Call signals (accept, reject, etc.)
 * - faithflow/{church_id}/call/{call_id}/participants - Participant updates
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL } from '@/constants/api';
import { useCallStore } from '@/stores/call';
import {
  CallSignal,
  CallSignalType,
  CallInviteSignal,
  CallAcceptSignal,
  CallRejectSignal,
  CallCancelSignal,
  CallEndSignal,
  CallRingingSignal,
  ParticipantJoinedSignal,
  ParticipantLeftSignal,
  ParticipantMutedSignal,
  ParticipantVideoSignal,
} from '@/types/call';

// =============================================================================
// Configuration
// =============================================================================

const TOPIC_PREFIX = 'faithflow';

function getDevHost(): string {
  const debuggerHost =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    // @ts-ignore
    Constants.manifest2?.extra?.expoGo?.debuggerHost?.split(':')[0] ||
    // @ts-ignore
    Constants.manifest?.debuggerHost?.split(':')[0];

  if (debuggerHost && debuggerHost !== 'localhost') {
    return debuggerHost;
  }

  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return 'localhost';
}

function getBrokerUrl(): string {
  if (__DEV__) {
    const host = getDevHost();
    return `ws://${host}:8083/mqtt`;
  }

  try {
    const url = new URL(API_BASE_URL);
    const mqttHost = url.hostname.replace(/^api\./, 'mqtt.');
    return `wss://${mqttHost}:8084/mqtt`;
  } catch {
    return 'wss://mqtt.flow.gkbj.org:8084/mqtt';
  }
}

// =============================================================================
// Call Signaling Service
// =============================================================================

interface CallSignalingOptions {
  churchId: string;
  memberId: string;
  token: string;
}

class CallSignalingService {
  private client: MqttClient | null = null;
  private churchId: string = '';
  private memberId: string = '';
  private currentCallId: string | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;

  // ---------------------------------------------------------------------------
  // Connection Management
  // ---------------------------------------------------------------------------

  async connect(options: CallSignalingOptions): Promise<void> {
    if (this.client?.connected) {
      console.log('[CallSignaling] Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('[CallSignaling] Connection in progress');
      return;
    }

    this.isConnecting = true;
    this.churchId = options.churchId;
    this.memberId = options.memberId;

    const brokerUrl = getBrokerUrl();
    console.log('[CallSignaling] Connecting to:', brokerUrl);

    const clientOptions: IClientOptions = {
      clientId: `ff-call-${options.memberId}-${Date.now()}`,
      clean: true,
      keepalive: 60,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      username: options.memberId,
      password: options.token,
    };

    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(brokerUrl, clientOptions);

        this.client.on('connect', () => {
          console.log('[CallSignaling] Connected');
          this.isConnected = true;
          this.isConnecting = false;
          this.subscribeToMemberTopics();
          resolve();
        });

        this.client.on('error', (error) => {
          console.error('[CallSignaling] Error:', error);
          this.isConnecting = false;
          reject(error);
        });

        this.client.on('close', () => {
          console.log('[CallSignaling] Disconnected');
          this.isConnected = false;
        });

        this.client.on('message', this.handleMessage.bind(this));

        // Connection timeout
        setTimeout(() => {
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(new Error('Connection timeout'));
          }
        }, 30000);

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.client) {
      this.unsubscribeFromCallTopics();
      this.client.end(true);
      this.client = null;
      this.isConnected = false;
      this.churchId = '';
      this.memberId = '';
      this.currentCallId = null;
      console.log('[CallSignaling] Disconnected');
    }
  }

  // ---------------------------------------------------------------------------
  // Topic Subscription
  // ---------------------------------------------------------------------------

  private subscribeToMemberTopics(): void {
    if (!this.client || !this.churchId || !this.memberId) return;

    // Subscribe to incoming calls
    const incomingCallTopic = `${TOPIC_PREFIX}/${this.churchId}/member/${this.memberId}/incoming_call`;
    this.client.subscribe(incomingCallTopic, { qos: 2 }, (err) => {
      if (err) {
        console.error('[CallSignaling] Failed to subscribe to incoming_call:', err);
      } else {
        console.log('[CallSignaling] Subscribed to incoming_call');
      }
    });

    // Subscribe to call status updates
    const callStatusTopic = `${TOPIC_PREFIX}/${this.churchId}/member/${this.memberId}/call_status`;
    this.client.subscribe(callStatusTopic, { qos: 2 }, (err) => {
      if (err) {
        console.error('[CallSignaling] Failed to subscribe to call_status:', err);
      } else {
        console.log('[CallSignaling] Subscribed to call_status');
      }
    });
  }

  subscribeToCallTopics(callId: string): void {
    if (!this.client || !this.churchId) return;

    this.currentCallId = callId;

    // Subscribe to call signals
    const signalTopic = `${TOPIC_PREFIX}/${this.churchId}/call/${callId}/signal`;
    this.client.subscribe(signalTopic, { qos: 2 }, (err) => {
      if (err) {
        console.error('[CallSignaling] Failed to subscribe to signal:', err);
      } else {
        console.log('[CallSignaling] Subscribed to call signals');
      }
    });

    // Subscribe to participant updates
    const participantsTopic = `${TOPIC_PREFIX}/${this.churchId}/call/${callId}/participants`;
    this.client.subscribe(participantsTopic, { qos: 1 }, (err) => {
      if (err) {
        console.error('[CallSignaling] Failed to subscribe to participants:', err);
      } else {
        console.log('[CallSignaling] Subscribed to participants');
      }
    });
  }

  unsubscribeFromCallTopics(): void {
    if (!this.client || !this.churchId || !this.currentCallId) return;

    const signalTopic = `${TOPIC_PREFIX}/${this.churchId}/call/${this.currentCallId}/signal`;
    const participantsTopic = `${TOPIC_PREFIX}/${this.churchId}/call/${this.currentCallId}/participants`;

    this.client.unsubscribe([signalTopic, participantsTopic]);
    this.currentCallId = null;
  }

  // ---------------------------------------------------------------------------
  // Message Handling
  // ---------------------------------------------------------------------------

  private handleMessage(topic: string, message: Buffer): void {
    try {
      const payload = JSON.parse(message.toString()) as CallSignal;
      console.log('[CallSignaling] Received:', payload.type, 'on', topic);

      // Get call store actions
      const store = useCallStore.getState();

      switch (payload.type) {
        case CallSignalType.INVITE:
          this.handleIncomingCall(payload as CallInviteSignal);
          break;

        case CallSignalType.ACCEPT:
          store.handleCallAccepted(payload as CallAcceptSignal);
          break;

        case CallSignalType.REJECT:
        case CallSignalType.BUSY:
          store.handleCallRejected(payload as CallRejectSignal);
          break;

        case CallSignalType.CANCEL:
          store.handleCallCancelled(payload as CallCancelSignal);
          break;

        case CallSignalType.END:
          store.handleCallEnded(payload as CallEndSignal);
          break;

        case CallSignalType.RINGING:
          // Ringing acknowledgement - caller knows callee received invite
          console.log('[CallSignaling] Call ringing acknowledged');
          break;

        case CallSignalType.PARTICIPANT_JOINED:
          store.handleParticipantJoined(payload as ParticipantJoinedSignal);
          break;

        case CallSignalType.PARTICIPANT_LEFT:
          store.handleParticipantLeft(payload as ParticipantLeftSignal);
          break;

        case CallSignalType.PARTICIPANT_MUTED:
          store.handleParticipantMuted(payload as ParticipantMutedSignal);
          break;

        case CallSignalType.PARTICIPANT_VIDEO:
          store.handleParticipantVideo(payload as ParticipantVideoSignal);
          break;

        default:
          console.log('[CallSignaling] Unknown signal type:', (payload as any).type);
      }

    } catch (error) {
      console.error('[CallSignaling] Failed to parse message:', error);
    }
  }

  private handleIncomingCall(signal: CallInviteSignal): void {
    const store = useCallStore.getState();

    // Check if we're the caller (ignore our own call invitation)
    if (signal.caller.id === this.memberId) {
      return;
    }

    // Subscribe to call topics
    this.subscribeToCallTopics(signal.call_id);

    // Dispatch to store
    store.handleIncomingCall(signal);

    // Send ringing acknowledgement
    this.sendRingingAck(signal.call_id);
  }

  // ---------------------------------------------------------------------------
  // Outgoing Signals
  // ---------------------------------------------------------------------------

  private sendRingingAck(callId: string): void {
    if (!this.client || !this.churchId) return;

    const topic = `${TOPIC_PREFIX}/${this.churchId}/call/${callId}/signal`;
    const payload: CallRingingSignal = {
      type: CallSignalType.RINGING,
      call_id: callId,
      callee_id: this.memberId,
      callee_name: '', // Will be filled by backend
      timestamp: new Date().toISOString(),
    };

    this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
  }

  // ---------------------------------------------------------------------------
  // State Getters
  // ---------------------------------------------------------------------------

  get connected(): boolean {
    return this.isConnected;
  }

  get activeCallId(): string | null {
    return this.currentCallId;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

export const callSignalingService = new CallSignalingService();

// =============================================================================
// Hook for connecting/disconnecting
// =============================================================================

export async function initializeCallSignaling(
  churchId: string,
  memberId: string,
  token: string
): Promise<void> {
  await callSignalingService.connect({ churchId, memberId, token });
}

export function cleanupCallSignaling(): void {
  callSignalingService.disconnect();
}
