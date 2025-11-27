/**
 * MQTT Service for FaithFlow Mobile App
 *
 * Handles real-time messaging via EMQX MQTT broker:
 * - WebSocket connection (port 8083/8084)
 * - JWT authentication
 * - Topic subscription management
 * - Message parsing and callbacks
 *
 * Topic structure: faithflow/{church_id}/community/{community_id}/{channel}
 * Channel types: general, announcement, subgroup/{subgroup_id}
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { API_BASE_URL } from '@/constants/api';

// Get the development host for MQTT connection
// - iOS Simulator: localhost works
// - Android Emulator: 10.0.2.2 is the host loopback
// - Physical device (iOS/Android): Use Expo's detected host IP
function getDevHost(): string {
  // Try to get the debugger host from Expo (works in Expo Go)
  // This gives us the IP address of the dev machine
  const debuggerHost =
    Constants.expoConfig?.hostUri?.split(':')[0] ||
    // @ts-ignore - manifest2 exists in newer Expo versions
    Constants.manifest2?.extra?.expoGo?.debuggerHost?.split(':')[0] ||
    // @ts-ignore - manifest exists in older Expo versions
    Constants.manifest?.debuggerHost?.split(':')[0];

  if (debuggerHost && debuggerHost !== 'localhost') {
    console.log(`[MQTT] Using Expo debugger host: ${debuggerHost}`);
    return debuggerHost;
  }

  // Platform-specific fallbacks
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach host machine
    return '10.0.2.2';
  }

  // iOS simulator can use localhost
  return 'localhost';
}

// =============================================================================
// TYPES
// =============================================================================

export type MQTTMessageType =
  | 'new_message'
  | 'edit_message'
  | 'delete_message'
  | 'typing'
  | 'read_receipt'
  | 'reaction'
  | 'presence'
  | 'system';

export interface MQTTPayload {
  type: MQTTMessageType;
  data: any;
  timestamp: string;
  sender_id?: string;
}

export interface MQTTConnectionOptions {
  churchId: string;
  memberId: string;
  memberName: string;
  token: string;
}

export type MessageCallback = (topic: string, payload: MQTTPayload) => void;
export type ConnectionCallback = (connected: boolean) => void;
export type ErrorCallback = (error: Error) => void;

// =============================================================================
// MQTT SERVICE CLASS
// =============================================================================

class MQTTService {
  private client: MqttClient | null = null;
  private messageCallbacks: Map<string, Set<MessageCallback>> = new Map();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private errorCallbacks: Set<ErrorCallback> = new Set();
  private subscribedTopics: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = __DEV__ ? 3 : 10; // Fewer attempts in dev
  private connectionOptions: MQTTConnectionOptions | null = null;
  private isConnecting = false;

  // Get MQTT broker URL based on environment
  private getBrokerUrl(): string {
    // Development: ws://{host}:8083/mqtt
    // Production: wss://mqtt.yourdomain.com:8084/mqtt
    if (__DEV__) {
      const host = getDevHost();
      const url = `ws://${host}:8083/mqtt`;
      console.log(`[MQTT] Development broker URL: ${url}`);
      return url;
    }

    // For production, use the same domain but mqtt subdomain
    // API: https://api.flow.gkbj.org -> MQTT: wss://mqtt.flow.gkbj.org:8084/mqtt
    try {
      const url = new URL(API_BASE_URL);
      const mqttHost = url.hostname.replace(/^api\./, 'mqtt.');
      return `wss://${mqttHost}:8084/mqtt`;
    } catch {
      // Fallback
      return 'wss://mqtt.flow.gkbj.org:8084/mqtt';
    }
  }

  /**
   * Connect to MQTT broker
   */
  async connect(options: MQTTConnectionOptions): Promise<void> {
    if (this.client?.connected) {
      console.log('[MQTT] Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('[MQTT] Connection in progress');
      return;
    }

    this.isConnecting = true;
    this.connectionOptions = options;
    const brokerUrl = this.getBrokerUrl();

    console.log('[MQTT] Connecting to:', brokerUrl);

    // Build client options
    const clientOptions: IClientOptions = {
      clientId: `faithflow-mobile-${options.memberId}-${Date.now()}`,
      clean: true,
      keepalive: 60,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      // Will message for presence tracking
      will: {
        topic: `faithflow/${options.churchId}/presence`,
        payload: JSON.stringify({
          type: 'presence',
          data: {
            member_id: options.memberId,
            member_name: options.memberName,
            status: 'offline',
          },
          timestamp: new Date().toISOString(),
        }),
        qos: 1,
        retain: false,
      },
    };

    // Only add authentication in production
    // In development, EMQX allows anonymous connections
    if (!__DEV__) {
      clientOptions.username = options.memberId;
      clientOptions.password = options.token;
      console.log('[MQTT] Production mode - using JWT authentication');
    } else {
      console.log('[MQTT] Development mode - anonymous connection (no auth)');
    }

    try {
      this.client = mqtt.connect(brokerUrl, clientOptions);

      this.client.on('connect', () => {
        console.log('[MQTT] Connected successfully');
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Re-subscribe to all previously subscribed topics
        this.subscribedTopics.forEach((topic) => {
          this.client?.subscribe(topic, { qos: 1 });
        });

        // Notify connection callbacks
        this.connectionCallbacks.forEach((cb) => cb(true));

        // Publish online presence
        this.publishPresence('online');
      });

      this.client.on('message', (topic: string, message: Buffer) => {
        try {
          const payload: MQTTPayload = JSON.parse(message.toString());
          this.handleMessage(topic, payload);
        } catch (error) {
          console.error('[MQTT] Failed to parse message:', error);
        }
      });

      this.client.on('error', (error: Error) => {
        console.error('[MQTT] Connection error:', error);
        this.isConnecting = false;
        this.errorCallbacks.forEach((cb) => cb(error));
      });

      this.client.on('close', () => {
        console.log('[MQTT] Connection closed');
        this.isConnecting = false;
        this.connectionCallbacks.forEach((cb) => cb(false));
      });

      this.client.on('reconnect', () => {
        this.reconnectAttempts++;
        console.log(`[MQTT] Reconnecting... attempt ${this.reconnectAttempts}`);

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[MQTT] Max reconnection attempts reached');
          this.disconnect();
        }
      });

      this.client.on('offline', () => {
        console.log('[MQTT] Client went offline');
      });
    } catch (error) {
      this.isConnecting = false;
      console.error('[MQTT] Failed to connect:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MQTT broker
   */
  disconnect(): void {
    if (this.client) {
      // Publish offline presence before disconnecting
      if (this.client.connected && this.connectionOptions) {
        this.publishPresence('offline');
      }

      this.client.end(true);
      this.client = null;
    }

    this.subscribedTopics.clear();
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.connectionOptions = null;
    console.log('[MQTT] Disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  /**
   * Subscribe to a community channel
   */
  subscribeToCommunity(
    churchId: string,
    communityId: string,
    channelType: 'general' | 'announcement' | 'subgroup' = 'general',
    subgroupId?: string
  ): void {
    let topic = `faithflow/${churchId}/community/${communityId}/${channelType}`;
    if (channelType === 'subgroup' && subgroupId) {
      topic = `faithflow/${churchId}/community/${communityId}/subgroup/${subgroupId}`;
    }

    this.subscribe(topic);
  }

  /**
   * Unsubscribe from a community channel
   */
  unsubscribeFromCommunity(
    churchId: string,
    communityId: string,
    channelType: 'general' | 'announcement' | 'subgroup' = 'general',
    subgroupId?: string
  ): void {
    let topic = `faithflow/${churchId}/community/${communityId}/${channelType}`;
    if (channelType === 'subgroup' && subgroupId) {
      topic = `faithflow/${churchId}/community/${communityId}/subgroup/${subgroupId}`;
    }

    this.unsubscribe(topic);
  }

  /**
   * Subscribe to a topic
   */
  subscribe(topic: string): void {
    if (!this.client) {
      console.warn('[MQTT] Cannot subscribe - not connected');
      this.subscribedTopics.add(topic); // Queue for when connected
      return;
    }

    if (this.subscribedTopics.has(topic)) {
      return; // Already subscribed
    }

    this.client.subscribe(topic, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to subscribe to ${topic}:`, err);
      } else {
        console.log(`[MQTT] Subscribed to ${topic}`);
        this.subscribedTopics.add(topic);
      }
    });
  }

  /**
   * Unsubscribe from a topic
   */
  unsubscribe(topic: string): void {
    this.subscribedTopics.delete(topic);

    if (!this.client) {
      return;
    }

    this.client.unsubscribe(topic, (err) => {
      if (err) {
        console.error(`[MQTT] Failed to unsubscribe from ${topic}:`, err);
      } else {
        console.log(`[MQTT] Unsubscribed from ${topic}`);
      }
    });
  }

  /**
   * Publish typing indicator
   */
  publishTyping(
    churchId: string,
    communityId: string,
    isTyping: boolean,
    channelType: 'general' | 'announcement' | 'subgroup' = 'general',
    subgroupId?: string
  ): void {
    if (!this.client?.connected || !this.connectionOptions) {
      return;
    }

    let topic = `faithflow/${churchId}/community/${communityId}/${channelType}`;
    if (channelType === 'subgroup' && subgroupId) {
      topic = `faithflow/${churchId}/community/${communityId}/subgroup/${subgroupId}`;
    }

    const payload: MQTTPayload = {
      type: 'typing',
      data: {
        member_id: this.connectionOptions.memberId,
        member_name: this.connectionOptions.memberName,
        is_typing: isTyping,
      },
      timestamp: new Date().toISOString(),
      sender_id: this.connectionOptions.memberId,
    };

    this.client.publish(topic, JSON.stringify(payload), { qos: 0 });
  }

  /**
   * Publish presence status
   */
  private publishPresence(status: 'online' | 'offline' | 'away'): void {
    if (!this.client?.connected || !this.connectionOptions) {
      return;
    }

    const topic = `faithflow/${this.connectionOptions.churchId}/presence`;
    const payload: MQTTPayload = {
      type: 'presence',
      data: {
        member_id: this.connectionOptions.memberId,
        member_name: this.connectionOptions.memberName,
        status,
      },
      timestamp: new Date().toISOString(),
      sender_id: this.connectionOptions.memberId,
    };

    this.client.publish(topic, JSON.stringify(payload), { qos: 1 });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(topic: string, payload: MQTTPayload): void {
    // Don't process own typing indicators
    if (
      payload.type === 'typing' &&
      payload.sender_id === this.connectionOptions?.memberId
    ) {
      return;
    }

    // Notify topic-specific callbacks
    const topicCallbacks = this.messageCallbacks.get(topic);
    if (topicCallbacks) {
      topicCallbacks.forEach((cb) => cb(topic, payload));
    }

    // Notify wildcard callbacks (all messages)
    const wildcardCallbacks = this.messageCallbacks.get('*');
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach((cb) => cb(topic, payload));
    }
  }

  /**
   * Register message callback for a topic
   */
  onMessage(topic: string, callback: MessageCallback): () => void {
    if (!this.messageCallbacks.has(topic)) {
      this.messageCallbacks.set(topic, new Set());
    }
    this.messageCallbacks.get(topic)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.messageCallbacks.get(topic)?.delete(callback);
    };
  }

  /**
   * Register connection state callback
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  /**
   * Register error callback
   */
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Get list of subscribed topics
   */
  getSubscribedTopics(): string[] {
    return Array.from(this.subscribedTopics);
  }
}

// Export singleton instance
export const mqttService = new MQTTService();
export default mqttService;
