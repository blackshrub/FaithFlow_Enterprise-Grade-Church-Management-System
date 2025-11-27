/**
 * MQTT Provider - Initializes MQTT connection at app root
 *
 * This component should wrap the app to enable real-time messaging.
 * It automatically connects when authenticated and disconnects on logout.
 */

import React from 'react';
import { useMQTT } from '@/hooks/useMqtt';

interface MQTTProviderProps {
  children: React.ReactNode;
}

/**
 * MQTT Connection Manager Component
 * Handles MQTT lifecycle based on authentication state
 */
function MQTTConnectionManager() {
  // This hook manages the MQTT connection
  const { isConnected, isConnecting, connectionError } = useMQTT();

  // Log connection status in dev
  if (__DEV__) {
    if (connectionError) {
      console.log('[MQTTProvider] Connection error:', connectionError);
    } else if (isConnecting) {
      console.log('[MQTTProvider] Connecting...');
    } else if (isConnected) {
      console.log('[MQTTProvider] Connected');
    }
  }

  return null;
}

/**
 * MQTT Provider Component
 * Wraps app with MQTT connection management
 */
export function MQTTProvider({ children }: MQTTProviderProps) {
  return (
    <>
      <MQTTConnectionManager />
      {children}
    </>
  );
}

export default MQTTProvider;
