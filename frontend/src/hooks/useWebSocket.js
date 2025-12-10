/**
 * WebSocket Hook with Auto-Reconnect
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - JWT authentication via query param
 * - Message type filtering
 * - Connection state management
 * - Heartbeat keep-alive
 *
 * Usage:
 * const { isConnected, lastMessage, sendMessage } = useWebSocket({
 *   onMessage: (msg) => {
 *     if (msg.type === 'attendance:update') {
 *       // Handle attendance update
 *     }
 *   }
 * });
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const WS_BASE_URL = import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
  window.location.host;

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff
const HEARTBEAT_INTERVAL = 30000; // 30 seconds

/**
 * @typedef {Object} WebSocketHookOptions
 * @property {function} [onMessage] - Callback for all messages
 * @property {function} [onConnect] - Callback when connected
 * @property {function} [onDisconnect] - Callback when disconnected
 * @property {string[]} [subscribeEvents] - Event types to subscribe to
 * @property {boolean} [autoConnect=true] - Auto-connect on mount
 */

/**
 * WebSocket hook for real-time updates
 * @param {WebSocketHookOptions} options
 */
export function useWebSocket({
  onMessage,
  onConnect,
  onDisconnect,
  subscribeEvents = [],
  autoConnect = true,
} = {}) {
  const { token, sessionChurchId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected, connecting, connected, reconnecting

  const wsRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  // Store callbacks in refs to avoid re-creating connection on callback changes
  // This prevents memory leaks from callback function identity changes
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);

  // Keep refs updated with latest callbacks
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    onConnectRef.current = onConnect;
  }, [onConnect]);

  useEffect(() => {
    onDisconnectRef.current = onDisconnect;
  }, [onDisconnect]);

  // Memoize subscribeEvents to prevent unnecessary reconnections
  const subscribeEventsKey = useMemo(() => JSON.stringify(subscribeEvents), [subscribeEvents]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Send message to WebSocket
  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Connect to WebSocket
  // Using refs for callbacks to avoid dependency changes causing reconnections
  const connect = useCallback(() => {
    if (!token || !sessionChurchId) {
      return;
    }

    // Clean up existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }
    cleanup();

    setConnectionState('connecting');

    const wsUrl = `${WS_BASE_URL}/ws/${sessionChurchId}?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setConnectionState('connected');
      reconnectAttemptRef.current = 0;

      // Subscribe to events (parse from memoized key)
      const events = JSON.parse(subscribeEventsKey);
      if (events.length > 0) {
        sendMessage({ type: 'subscribe', events });
      }

      // Start heartbeat
      heartbeatIntervalRef.current = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, HEARTBEAT_INTERVAL);

      // Call callback from ref (avoids stale closure)
      onConnectRef.current?.();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);

        // Ignore pong messages
        if (message.type !== 'pong') {
          // Call callback from ref (avoids stale closure)
          onMessageRef.current?.(message);
        }
      } catch (e) {
        console.error('WebSocket message parse error:', e);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      cleanup();

      // Don't reconnect if closed normally or auth failed
      if (event.code === 1000 || event.code === 4001 || event.code === 4003) {
        setConnectionState('disconnected');
        onDisconnectRef.current?.();
        return;
      }

      // Attempt reconnection with backoff
      setConnectionState('reconnecting');
      const delay = RECONNECT_DELAYS[
        Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)
      ];
      reconnectAttemptRef.current++;

      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);

      onDisconnectRef.current?.();
    };

    ws.onerror = () => {
      // Error handling - onclose will be called after
    };
  }, [token, sessionChurchId, subscribeEventsKey, sendMessage, cleanup]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    cleanup();
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    setConnectionState('disconnected');
  }, [cleanup]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect && token && sessionChurchId) {
      connect();
    }

    // Cleanup on unmount - ensure all intervals/timeouts are cleared
    return () => {
      disconnect();
    };
  }, [autoConnect, token, sessionChurchId, connect, disconnect]);

  return {
    isConnected,
    connectionState,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
  };
}

/**
 * Hook for specific WebSocket event types
 * @param {string} eventType - Event type to listen for
 * @param {function} callback - Callback when event received
 */
export function useWebSocketEvent(eventType, callback) {
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage?.type === eventType) {
      callback(lastMessage);
    }
  }, [lastMessage, eventType, callback]);
}

/**
 * Hook for real-time attendance updates
 * @param {string} eventId - Event ID to watch
 */
export function useAttendanceUpdates(eventId) {
  const [count, setCount] = useState(0);

  const { isConnected } = useWebSocket({
    subscribeEvents: ['attendance:update'],
    onMessage: (msg) => {
      if (msg.type === 'attendance:update' && msg.event_id === eventId) {
        setCount(msg.count);
      }
    },
  });

  return { count, isConnected };
}

/**
 * Hook for real-time giving notifications (admin)
 */
export function useGivingNotifications() {
  const [notifications, setNotifications] = useState([]);

  const { isConnected } = useWebSocket({
    subscribeEvents: ['giving:received'],
    onMessage: (msg) => {
      if (msg.type === 'giving:received') {
        setNotifications((prev) => [msg, ...prev].slice(0, 10)); // Keep last 10
      }
    },
  });

  return { notifications, isConnected };
}

export default useWebSocket;
