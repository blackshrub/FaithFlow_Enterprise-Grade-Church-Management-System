/**
 * ChatMenuSheet - WhatsApp-Style Menu Bottom Sheet
 *
 * A clean, production-ready menu for chat actions:
 * - Announcements
 * - Sub-groups
 * - Create Poll
 * - Community Info
 * - Disappearing Messages
 * - Settings (leaders only)
 *
 * Styling: NativeWind-first with inline style for dynamic colors
 */

import React, { memo, useRef, useCallback, useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import {
  Megaphone,
  Users,
  BarChart3,
  Info,
  Timer,
  Settings,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { DisappearingIndicator, type DisappearingDuration } from './DisappearingMessages';

// =============================================================================
// CONSTANTS
// =============================================================================

const COLORS = {
  warning: { bg: '#FEF3C7', fg: '#F59E0B' },
  secondary: { bg: '#DBEAFE', fg: '#3B82F6' },
  info: { bg: '#CFFAFE', fg: '#06B6D4' },
  gray: { bg: '#f3f4f6', fg: '#6b7280' },
  success: { bg: '#D1FAE5', fg: '#10B981' },
  primary: { bg: '#EDE9FE', fg: '#8B5CF6' },
};

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onAnnouncements: () => void;
  onSubgroups: () => void;
  onCreatePoll: () => void;
  onCommunityInfo: () => void;
  onDisappearingMessages: () => void;
  onSettings?: () => void;
  isLeader?: boolean;
  disappearingDuration?: DisappearingDuration;
}

// =============================================================================
// MENU ITEM COMPONENT
// =============================================================================

interface MenuItemProps {
  icon: React.ElementType;
  title: string;
  description: string;
  color: { bg: string; fg: string };
  onPress: () => void;
  rightElement?: React.ReactNode;
}

const MenuItem = memo(
  ({ icon: IconComponent, title, description, color, onPress, rightElement }: MenuItemProps) => (
    <Pressable onPress={onPress} className="flex-row items-center px-4 py-4 rounded-xl">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-4"
        style={{ backgroundColor: color.bg }}
      >
        <IconComponent size={20} color={color.fg} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-medium text-gray-900">{title}</Text>
        <Text className="text-xs text-gray-500 mt-0.5">{description}</Text>
      </View>
      {rightElement}
    </Pressable>
  )
);

MenuItem.displayName = 'MenuItem';

// =============================================================================
// CHAT MENU SHEET COMPONENT
// =============================================================================

export const ChatMenuSheet = memo(
  ({
    visible,
    onClose,
    onAnnouncements,
    onSubgroups,
    onCreatePoll,
    onCommunityInfo,
    onDisappearingMessages,
    onSettings,
    isLeader = false,
    disappearingDuration = 'off',
  }: ChatMenuSheetProps) => {
    const { t } = useTranslation();
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

    const handlePress = useCallback(
      (action: () => void) => {
        onClose();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        action();
      },
      [onClose]
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={visible ? 0 : -1}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        onClose={onClose}
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{ backgroundColor: '#d1d5db' }}
      >
        <View className="flex-1 px-4 pt-2">
          {/* Announcements */}
          <MenuItem
            icon={Megaphone}
            title={t('chat.menu.announcements', 'Announcements')}
            description={t('chat.menu.announcementsDesc', 'Important updates from leaders')}
            color={COLORS.warning}
            onPress={() => handlePress(onAnnouncements)}
          />

          {/* Sub-groups */}
          <MenuItem
            icon={Users}
            title={t('chat.menu.subgroups', 'Sub-groups')}
            description={t('chat.menu.subgroupsDesc', 'Smaller groups within community')}
            color={COLORS.secondary}
            onPress={() => handlePress(onSubgroups)}
          />

          {/* Create Poll */}
          <MenuItem
            icon={BarChart3}
            title={t('chat.menu.createPoll', 'Create Poll')}
            description={t('chat.menu.createPollDesc', 'Ask the community a question')}
            color={COLORS.info}
            onPress={() => handlePress(onCreatePoll)}
          />

          {/* Community Info */}
          <MenuItem
            icon={Info}
            title={t('chat.menu.communityInfo', 'Community Info')}
            description={t('chat.menu.communityInfoDesc', 'Members, description, media')}
            color={COLORS.gray}
            onPress={() => handlePress(onCommunityInfo)}
          />

          {/* Disappearing Messages */}
          <MenuItem
            icon={Timer}
            title={t('chat.menu.disappearingMessages', 'Disappearing Messages')}
            description={
              disappearingDuration === 'off'
                ? t('chat.menu.off', 'Off')
                : t('chat.menu.messagesDisappearAfter', 'Messages disappear after {{duration}}', {
                    duration: disappearingDuration,
                  })
            }
            color={COLORS.success}
            onPress={() => handlePress(onDisappearingMessages)}
            rightElement={
              disappearingDuration !== 'off' ? (
                <DisappearingIndicator duration={disappearingDuration} size="sm" />
              ) : null
            }
          />

          {/* Settings (Leaders only) */}
          {isLeader && onSettings && (
            <MenuItem
              icon={Settings}
              title={t('chat.menu.settings', 'Settings')}
              description={t('chat.menu.settingsDesc', 'Manage community settings')}
              color={COLORS.primary}
              onPress={() => handlePress(onSettings)}
            />
          )}
        </View>
      </BottomSheet>
    );
  }
);

ChatMenuSheet.displayName = 'ChatMenuSheet';

export default ChatMenuSheet;
