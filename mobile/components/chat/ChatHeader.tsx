/**
 * ChatHeader - WhatsApp iOS Style Chat Header
 *
 * Modern WhatsApp iOS design with:
 * - White/light background
 * - Dark text and icons
 * - Back chevron integrated with avatar
 * - Clean, minimal layout
 * - Typing indicator in green
 *
 * Styling: NativeWind-first with inline style for shadow values
 */

import React, { memo } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated from 'react-native-reanimated';
import { ChevronLeft, Search, MoreVertical, Phone, Video } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

import { PMotionV10 } from '@/components/motion/premium-motion';

// =============================================================================
// CONSTANTS - WhatsApp iOS Colors (Modern)
// =============================================================================

const COLORS = {
  // Background - lighter beige (matches chat background)
  headerBg: '#F5F2EC',

  // Text
  textPrimary: '#000000',
  textSecondary: '#667781',
  typingGreen: '#25D366',

  // Icons - dark grey like WhatsApp
  iconColor: '#54656F',

  // Borders
  borderColor: '#D1D7DB',
};

// =============================================================================
// TYPES
// =============================================================================

export interface ChatHeaderProps {
  communityName: string;
  communityImage?: string;
  memberCount: number;
  typingText?: string | null;
  onBack: () => void;
  onPress: () => void;
  onSearch: () => void;
  onMenu: () => void;
}

// =============================================================================
// CHAT HEADER COMPONENT
// =============================================================================

export const ChatHeader = memo(
  ({
    communityName,
    communityImage,
    memberCount,
    typingText,
    onBack,
    onPress,
    onSearch,
    onMenu,
  }: ChatHeaderProps) => {
    const { t } = useTranslation();

    return (
      <Animated.View
        entering={PMotionV10.subtleSlide('right')}
        exiting={PMotionV10.screenFadeOut}
        style={{
          backgroundColor: COLORS.headerBg,
          borderBottomWidth: 0.5,
          borderBottomColor: COLORS.borderColor,
        }}
      >
        <View className="flex-row items-center" style={{ height: 56 }}>
          {/* Back button with chevron - moved right for easier pressing */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBack();
            }}
            className="flex-row items-center justify-center"
            style={{ height: 56, width: 44, paddingLeft: 4 }}
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 8 }}
          >
            <ChevronLeft size={28} color={COLORS.iconColor} strokeWidth={2} />
          </Pressable>

          {/* Avatar + Info - tappable together, indented ~20px from chevron */}
          <Pressable
            className="flex-row items-center flex-1"
            style={{ marginLeft: 20 }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onPress();
            }}
          >
            {/* Community avatar - larger like WhatsApp (44px) */}
            {communityImage ? (
              <Image
                source={{ uri: communityImage }}
                className="w-11 h-11 rounded-full"
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            ) : (
              <View
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: '#128C7E' }}
              >
                <Text
                  className="text-[15px] font-semibold"
                  style={{ color: '#FFFFFF' }}
                >
                  {communityName?.substring(0, 2).toUpperCase() || '??'}
                </Text>
              </View>
            )}

            {/* Community info - moved right */}
            <View className="ml-3 flex-1">
              <Text
                className="text-[17px] font-semibold"
                style={{ color: COLORS.textPrimary }}
                numberOfLines={1}
              >
                {communityName || 'Community'}
              </Text>
              {typingText ? (
                <Text
                  className="text-[13px]"
                  style={{ color: COLORS.typingGreen }}
                >
                  {typingText}
                </Text>
              ) : (
                <Text
                  className="text-[13px]"
                  style={{ color: COLORS.textSecondary }}
                >
                  {t('chat.memberCount', '{{count}} members', { count: memberCount || 0 })}
                </Text>
              )}
            </View>
          </Pressable>

          {/* Action buttons - dark grey icons */}
          <View className="flex-row items-center pr-3">
            {/* Video call button */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Video call - can be implemented later
              }}
              className="p-2.5"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Video size={27} color={COLORS.iconColor} strokeWidth={1.5} />
            </Pressable>

            {/* Voice call button */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Voice call - can be implemented later
              }}
              className="p-2.5"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Phone size={22} color={COLORS.iconColor} />
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  }
);

ChatHeader.displayName = 'ChatHeader';

export default ChatHeader;
