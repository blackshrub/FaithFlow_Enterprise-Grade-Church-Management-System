/**
 * WebSocket Store for Real-time Mobile Updates
 *
 * Features:
 * - Auto-reconnect with exponential backoff
 * - JWT authentication
 * - App state awareness (disconnect when backgrounded)
 * - Network state awareness (reconnect when online)
 * - Event-based messaging
 *
 * Usage:
 * const { isConnected, connect, disconnect, lastMessage } = useWebSocketStore();
 *
 * // In a component
 * useEffect(() => {
 *   const unsubscribe = useWebSocketStore.subscribe(
 *     (state) => state.lastMessage,
 *     (message) => {
 *       if (message?.type === 'attendance:update') {
 *         // Handle update
 *       }
 *     }
 *   );
 *   return unsubscribe;
 * }, []);
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { AppState, AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuthStore } from './auth';

const WS_BASE_URL = process.env.EXPO_PUBLIC_WS_URL || 'wss://api.faithflow.id';
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];
const HEARTBEAT_INTERVAL = 30000;

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface WebSocketMessage {
  type: string;
  timestamp?: string;
  [key: string]: any;
}

interface WebSocketStore {
  // State
  isConnected: boolean;
  connectionState: ConnectionState;
  lastMessage: WebSocketMessage | null;
  messageHistory: WebSocketMessage[];

  // Internal
  _ws: WebSocket | null;
  _reconnectAttempt: number;
  _reconnectTimeout: NodeJS.Timeout | null;
  _heartbeatInterval: NodeJS.Timeout | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  sendMessage: (message: object) => boolean;
  subscribe: (events: string[]) => void;

  // Internal actions
  _handleOpen: () => void;
  _handleMessage: (event: WebSocketMessageEvent) => void;
  _handleClose: (event: WebSocketCloseEvent) => void;
  _handleError: (event: WebSocketErrorEvent) => void;
  _cleanup: () => void;
  _scheduleReconnect: () => void;
}

export const useWebSocketStore = create<WebSocketStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    isConnected: false,
    connectionState: 'disconnected',
    lastMessage: null,
    messageHistory: [],

    // Internal state
    _ws: null,
    _reconnectAttempt: 0,
    _reconnectTimeout: null,
    _heartbeatInterval: null,

    connect: () => {
      const state = get();
      const authState = useAuthStore.getState();

      // Need token and church ID
      if (!authState.token || !authState.sessionChurchId) {
        console.log('[WS] Cannot connect: missing auth');
        return;
      }

      // Already connected or connecting
      if (state._ws?.readyState === WebSocket.OPEN ||
          state._ws?.readyState === WebSocket.CONNECTING) {
        return;
      }

      // Cleanup existing
      state._cleanup();

      set({ connectionState: 'connecting' });

      const wsUrl = `${WS_BASE_URL}/ws/${authState.sessionChurchId}?token=${authState.token}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => get()._handleOpen();
      ws.onmessage = (event) => get()._handleMessage(event);
      ws.onclose = (event) => get()._handleClose(event);
      ws.onerror = (event) => get()._handleError(event);

      set({ _ws: ws });
    },

    disconnect: () => {
      const state = get();
      state._cleanup();

      if (state._ws) {
        state._ws.close(1000, 'Client disconnect');
      }

      set({
        _ws: null,
        isConnected: false,
        connectionState: 'disconnected',
        _reconnectAttempt: 0,
      });
    },

    sendMessage: (message) => {
      const state = get();
      if (state._ws?.readyState === WebSocket.OPEN) {
        state._ws.send(JSON.stringify(message));
        return true;
      }
      return false;
    },

    subscribe: (events) => {
      get().sendMessage({ type: 'subscribe', events });
    },

    _handleOpen: () => {
      console.log('[WS] Connected');

      // Start heartbeat
      const heartbeatInterval = setInterval(() => {
        get().sendMessage({ type: 'ping' });
      }, HEARTBEAT_INTERVAL);

      set({
        isConnected: true,
        connectionState: 'connected',
        _reconnectAttempt: 0,
        _heartbeatInterval: heartbeatInterval,
      });
    },

    _handleMessage: (event) => {
      try {
        const message = JSON.parse(event.data) as WebSocketMessage;

        // Ignore pong messages
        if (message.type === 'pong') {
          return;
        }

        set((state) => ({
          lastMessage: message,
          messageHistory: [message, ...state.messageHistory].slice(0, 50), // Keep last 50
        }));
      } catch (e) {
        console.error('[WS] Message parse error:', e);
      }
    },

    _handleClose: (event) => {
      console.log('[WS] Closed:', event.code, event.reason);

      const state = get();
      state._cleanup();

      // Don't reconnect on normal close or auth failure
      if (event.code === 1000 || event.code === 4001 || event.code === 4003) {
        set({
          isConnected: false,
          connectionState: 'disconnected',
          _ws: null,
        });
        return;
      }

      // Schedule reconnection
      set({
        isConnected: false,
        connectionState: 'reconnecting',
      });
      state._scheduleReconnect();
    },

    _handleError: (event) => {
      console.error('[WS] Error:', event.message);
      // onclose will be called after error
    },

    _cleanup: () => {
      const state = get();

      if (state._heartbeatInterval) {
        clearInterval(state._heartbeatInterval);
      }
      if (state._reconnectTimeout) {
        clearTimeout(state._reconnectTimeout);
      }

      set({
        _heartbeatInterval: null,
        _reconnectTimeout: null,
      });
    },

    _scheduleReconnect: () => {
      const state = get();
      const delay = RECONNECT_DELAYS[
        Math.min(state._reconnectAttempt, RECONNECT_DELAYS.length - 1)
      ];

      console.log(`[WS] Reconnecting in ${delay}ms (attempt ${state._reconnectAttempt + 1})`);

      const timeout = setTimeout(() => {
        set((s) => ({ _reconnectAttempt: s._reconnectAttempt + 1 }));
        get().connect();
      }, delay);

      set({ _reconnectTimeout: timeout });
    },
  }))
);

// ============================================================================
// App State & Network Listeners
// ============================================================================

let appStateSubscription: any = null;
let netInfoSubscription: any = null;

/**
 * Initialize WebSocket listeners for app state and network changes.
 * Call this once in your root component.
 */
export function initializeWebSocketListeners() {
  // Cleanup existing
  if (appStateSubscription) {
    appStateSubscription.remove();
  }
  if (netInfoSubscription) {
    netInfoSubscription();
  }

  // App state listener - disconnect when backgrounded, reconnect when foregrounded
  appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    const store = useWebSocketStore.getState();

    if (nextAppState === 'active') {
      // App came to foreground
      if (!store.isConnected && store.connectionState === 'disconnected') {
        store.connect();
      }
    } else if (nextAppState === 'background') {
      // App went to background - disconnect to save battery
      store.disconnect();
    }
  });

  // Network state listener - reconnect when online
  netInfoSubscription = NetInfo.addEventListener((state) => {
    const store = useWebSocketStore.getState();

    if (state.isConnected && !store.isConnected) {
      // Network came back online
      setTimeout(() => {
        store.connect();
      }, 1000); // Small delay to ensure network is stable
    }
  });
}

/**
 * Cleanup WebSocket listeners.
 * Call this when unmounting root component.
 */
export function cleanupWebSocketListeners() {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
  if (netInfoSubscription) {
    netInfoSubscription();
    netInfoSubscription = null;
  }
  useWebSocketStore.getState().disconnect();
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook to listen for specific WebSocket event types
 */
export function useWebSocketEvent(
  eventType: string,
  callback: (message: WebSocketMessage) => void
) {
  const lastMessage = useWebSocketStore((state) => state.lastMessage);

  if (lastMessage?.type === eventType) {
    callback(lastMessage);
  }
}

/**
 * Selector for connection status
 */
export const selectIsConnected = (state: WebSocketStore) => state.isConnected;
export const selectConnectionState = (state: WebSocketStore) => state.connectionState;
export const selectLastMessage = (state: WebSocketStore) => state.lastMessage;
