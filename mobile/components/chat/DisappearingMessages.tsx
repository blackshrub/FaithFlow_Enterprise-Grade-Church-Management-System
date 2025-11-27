/**
 * DisappearingMessages Component
 *
 * WhatsApp-style disappearing messages settings.
 * Features:
 * - Set message auto-delete timer (24h, 7d, 90d, off)
 * - Visual indicator in chat header
 * - Countdown display on messages
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Timer, Clock, Check } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { colors, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export type DisappearingDuration = '24h' | '7d' | '90d' | 'off';

interface DisappearingMessagesSettingsProps {
  visible: boolean;
  onClose: () => void;
  currentDuration: DisappearingDuration;
  onDurationChange: (duration: DisappearingDuration) => void;
  isAdmin?: boolean;
}

interface DisappearingIndicatorProps {
  duration: DisappearingDuration;
  size?: 'sm' | 'md';
}

interface MessageCountdownProps {
  expiresAt: string;
  size?: 'sm' | 'md';
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DURATION_OPTIONS: Array<{
  value: DisappearingDuration;
  label: string;
  description: string;
}> = [
  {
    value: '24h',
    label: '24 hours',
    description: 'Messages will disappear after 24 hours',
  },
  {
    value: '7d',
    label: '7 days',
    description: 'Messages will disappear after 7 days',
  },
  {
    value: '90d',
    label: '90 days',
    description: 'Messages will disappear after 90 days',
  },
  {
    value: 'off',
    label: 'Off',
    description: 'Messages won\'t disappear',
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getDurationLabel(duration: DisappearingDuration): string {
  switch (duration) {
    case '24h':
      return '24h';
    case '7d':
      return '7d';
    case '90d':
      return '90d';
    default:
      return '';
  }
}

export function getDurationInMs(duration: DisappearingDuration): number {
  switch (duration) {
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    case '90d':
      return 90 * 24 * 60 * 60 * 1000;
    default:
      return 0;
  }
}

export function formatCountdown(expiresAt: string): string {
  const now = Date.now();
  const expiry = new Date(expiresAt).getTime();
  const remaining = expiry - now;

  if (remaining <= 0) return 'Expired';

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d`;
  }
  if (hours > 0) {
    return `${hours}h`;
  }
  return `${minutes}m`;
}

// =============================================================================
// DISAPPEARING INDICATOR
// =============================================================================

export function DisappearingIndicator({
  duration,
  size = 'sm',
}: DisappearingIndicatorProps) {
  if (duration === 'off') return null;

  const iconSize = size === 'sm' ? 'xs' : 'sm';

  return (
    <HStack space="xs" className="items-center">
      <Icon as={Timer} size={iconSize} style={{ color: colors.gray[500] }} />
      <Text style={[styles.indicatorText, size === 'md' && styles.indicatorTextMd]}>
        {getDurationLabel(duration)}
      </Text>
    </HStack>
  );
}

// =============================================================================
// MESSAGE COUNTDOWN
// =============================================================================

export function MessageCountdown({ expiresAt, size = 'sm' }: MessageCountdownProps) {
  const [countdown, setCountdown] = React.useState(formatCountdown(expiresAt));

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(expiresAt));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt]);

  const iconSize = size === 'sm' ? '2xs' : 'xs';

  return (
    <HStack space="xs" className="items-center">
      <Icon as={Clock} size={iconSize} style={{ color: colors.gray[400] }} />
      <Text style={[styles.countdownText, size === 'md' && styles.countdownTextMd]}>
        {countdown}
      </Text>
    </HStack>
  );
}

// =============================================================================
// SETTINGS SHEET
// =============================================================================

export function DisappearingMessagesSettings({
  visible,
  onClose,
  currentDuration,
  onDurationChange,
  isAdmin = false,
}: DisappearingMessagesSettingsProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['55%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleSelect = useCallback(
    (duration: DisappearingDuration) => {
      if (!isAdmin) {
        return;
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDurationChange(duration);
      onClose();
    },
    [isAdmin, onDurationChange, onClose]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        {/* Header */}
        <VStack space="xs" className="mb-4">
          <HStack space="sm" className="items-center">
            <Icon as={Timer} size="lg" style={{ color: '#128C7E' }} />
            <Text style={styles.title}>Disappearing messages</Text>
          </HStack>
          <Text style={styles.description}>
            When turned on, new messages will disappear after the selected time
          </Text>
        </VStack>

        {/* Options */}
        <VStack space="xs">
          {DURATION_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.optionRow,
                currentDuration === option.value && styles.optionRowSelected,
                !isAdmin && styles.optionRowDisabled,
              ]}
              onPress={() => handleSelect(option.value)}
              disabled={!isAdmin}
            >
              <VStack className="flex-1">
                <Text style={styles.optionLabel}>{option.label}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </VStack>
              {currentDuration === option.value && (
                <View style={styles.checkIcon}>
                  <Icon as={Check} size="md" style={{ color: '#128C7E' }} />
                </View>
              )}
            </Pressable>
          ))}
        </VStack>

        {/* Admin notice */}
        {!isAdmin && (
          <View style={styles.noticeContainer}>
            <Text style={styles.noticeText}>
              Only admins can change disappearing messages settings
            </Text>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

// =============================================================================
// CHAT HEADER BADGE
// =============================================================================

interface DisappearingBadgeProps {
  duration: DisappearingDuration;
  onPress?: () => void;
}

export function DisappearingBadge({ duration, onPress }: DisappearingBadgeProps) {
  if (duration === 'off') return null;

  return (
    <Pressable onPress={onPress} style={styles.badge}>
      <Icon as={Timer} size="xs" style={{ color: 'rgba(255,255,255,0.9)' }} />
    </Pressable>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Sheet styles
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: colors.gray[300],
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Header
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.gray[900],
  },
  description: {
    fontSize: 14,
    color: colors.gray[500],
    lineHeight: 20,
  },

  // Options
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[50],
    marginBottom: 8,
  },
  optionRowSelected: {
    backgroundColor: '#E8F5E9',
  },
  optionRowDisabled: {
    opacity: 0.6,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.gray[900],
  },
  optionDescription: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 2,
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Notice
  noticeContainer: {
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    padding: 12,
    marginTop: 16,
  },
  noticeText: {
    fontSize: 13,
    color: colors.gray[600],
    textAlign: 'center',
  },

  // Indicator
  indicatorText: {
    fontSize: 11,
    color: colors.gray[500],
  },
  indicatorTextMd: {
    fontSize: 13,
  },

  // Countdown
  countdownText: {
    fontSize: 10,
    color: colors.gray[400],
  },
  countdownTextMd: {
    fontSize: 12,
  },

  // Badge
  badge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});

export default DisappearingMessagesSettings;
