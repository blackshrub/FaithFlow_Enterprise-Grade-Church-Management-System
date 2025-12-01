/**
 * DisappearingMessages Component
 *
 * WhatsApp-style disappearing messages settings.
 * Features:
 * - Set message auto-delete timer (24h, 7d, 90d, off)
 * - Visual indicator in chat header
 * - Countdown display on messages
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Timer, Clock, Check } from 'lucide-react-native';

import { Text } from 'react-native';
import { colors } from '@/constants/theme';

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
    description: "Messages won't disappear",
  },
];

// Colors for icon usage only
const Colors = {
  gray300: colors.gray[300],
  gray400: colors.gray[400],
  gray500: colors.gray[500],
  whatsappTeal: '#128C7E',
};

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

  const iconSize = size === 'sm' ? 12 : 16;

  return (
    <View className="flex-row items-center gap-1">
      <Timer size={iconSize} color={Colors.gray500} />
      <Text className={`text-gray-500 ${size === 'md' ? 'text-[13px]' : 'text-[11px]'}`}>
        {getDurationLabel(duration)}
      </Text>
    </View>
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

  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <View className="flex-row items-center gap-1">
      <Clock size={iconSize} color={Colors.gray400} />
      <Text className={`text-gray-400 ${size === 'md' ? 'text-xs' : 'text-[10px]'}`}>
        {countdown}
      </Text>
    </View>
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
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      handleIndicatorStyle={{ backgroundColor: Colors.gray300, width: 40 }}
    >
      <View className="flex-1 px-5 pt-2">
        {/* Header */}
        <View className="mb-4">
          <View className="flex-row items-center gap-2 mb-1">
            <Timer size={24} color={Colors.whatsappTeal} />
            <Text className="text-xl font-semibold text-gray-900">
              Disappearing messages
            </Text>
          </View>
          <Text className="text-sm text-gray-500 leading-5">
            When turned on, new messages will disappear after the selected time
          </Text>
        </View>

        {/* Options */}
        <View className="gap-1">
          {DURATION_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              className={`flex-row items-center py-4 px-3 rounded-xl mb-2 ${
                currentDuration === option.value ? 'bg-green-50' : 'bg-gray-50'
              } ${!isAdmin ? 'opacity-60' : ''}`}
              onPress={() => handleSelect(option.value)}
              disabled={!isAdmin}
            >
              <View className="flex-1">
                <Text className="text-base font-medium text-gray-900">
                  {option.label}
                </Text>
                <Text className="text-[13px] text-gray-500 mt-0.5">
                  {option.description}
                </Text>
              </View>
              {currentDuration === option.value && (
                <View className="w-8 h-8 rounded-full bg-green-50 items-center justify-center">
                  <Check size={20} color={Colors.whatsappTeal} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Admin notice */}
        {!isAdmin && (
          <View className="bg-gray-100 rounded-xl p-3 mt-4">
            <Text className="text-[13px] text-gray-600 text-center">
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
    <Pressable
      onPress={onPress}
      className="w-5 h-5 rounded-full items-center justify-center ml-1"
      style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
    >
      <Timer size={12} color="rgba(255,255,255,0.9)" />
    </Pressable>
  );
}

export default DisappearingMessagesSettings;
