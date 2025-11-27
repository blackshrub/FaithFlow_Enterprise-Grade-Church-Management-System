/**
 * Caller Info Component
 *
 * Displays caller/callee information during calls.
 * Shows avatar, name, and call status/duration.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { MotiView } from 'moti';
import { Image } from 'expo-image';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { CallDuration, CallUIState } from '@/types/call';

interface CallerInfoProps {
  name: string;
  avatar?: string | null;
  uiState: CallUIState;
  duration?: CallDuration;
  subtitle?: string;
}

export function CallerInfo({
  name,
  avatar,
  uiState,
  duration,
  subtitle,
}: CallerInfoProps) {
  const getStatusText = (): string => {
    switch (uiState) {
      case 'outgoing':
        return 'Calling...';
      case 'incoming':
        return 'Incoming call';
      case 'connecting':
        return 'Connecting...';
      case 'active':
        return duration?.formatted || '00:00';
      case 'reconnecting':
        return 'Reconnecting...';
      case 'ended':
        return 'Call ended';
      default:
        return '';
    }
  };

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', delay: 100 }}
      style={styles.container}
    >
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {avatar ? (
          <Image
            source={{ uri: avatar }}
            style={styles.avatar}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>
              {name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}

        {/* Pulsing ring for ringing state */}
        {(uiState === 'outgoing' || uiState === 'incoming') && (
          <MotiView
            from={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.4, opacity: 0 }}
            transition={{
              type: 'timing',
              duration: 1500,
              loop: true,
            }}
            style={styles.pulseRing}
          />
        )}
      </View>

      {/* Name */}
      <Text style={styles.name} numberOfLines={1}>
        {name}
      </Text>

      {/* Status / Duration */}
      <Text style={styles.status}>
        {getStatusText()}
      </Text>

      {/* Optional subtitle (e.g., community name) */}
      {subtitle && (
        <Text style={styles.subtitle}>
          {subtitle}
        </Text>
      )}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarInitial: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.white,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary[400],
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 8,
  },
  status: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 8,
  },
});
