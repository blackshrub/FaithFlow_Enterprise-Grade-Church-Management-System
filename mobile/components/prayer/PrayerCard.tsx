/**
 * PrayerCard - Memoized Prayer Request Card Component
 *
 * Performance optimizations:
 * - React.memo prevents unnecessary re-renders
 * - useCallback for all event handlers
 * - Stable prop references via memoization
 *
 * Styling: NativeWind-first with Gluestack Button
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  Heart,
  User,
  CheckCircle,
  Sparkles,
  HandHeart,
} from 'lucide-react-native';

import { Button, ButtonText } from '@/components/ui/button';
import { PMotionV10 } from '@/components/motion/premium-motion';
import type { PrayerRequestWithStatus } from '@/types/prayer';

// Premium color palette - for icon colors only
const Colors = {
  gradient: {
    start: '#1e3a5f',
  },
  accent: {
    primary: '#E8B86D',
    sage: '#7FB685',
  },
  neutral: {
    400: '#A3A3A3',
  },
  success: '#10B981',
  white: '#FFFFFF',
};

// Category colors - muted, sophisticated
const CATEGORY_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  health: { bg: 'bg-red-50', text: 'text-red-800', accent: '#DC2626' },
  family: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-800', accent: '#C026D3' },
  financial: { bg: 'bg-green-50', text: 'text-green-800', accent: '#16A34A' },
  spiritual: { bg: 'bg-blue-50', text: 'text-blue-800', accent: '#2563EB' },
  work: { bg: 'bg-amber-50', text: 'text-amber-800', accent: '#D97706' },
  relationships: { bg: 'bg-pink-50', text: 'text-pink-800', accent: '#DB2777' },
  guidance: { bg: 'bg-sky-50', text: 'text-sky-800', accent: '#0284C7' },
  thanksgiving: { bg: 'bg-yellow-100', text: 'text-amber-800', accent: '#F59E0B' },
  other: { bg: 'bg-neutral-100', text: 'text-neutral-700', accent: '#71717A' },
};

interface PrayerCardProps {
  request: PrayerRequestWithStatus;
  index: number;
  isOwner: boolean;
  isPraying: boolean;
  isMarking: boolean;
  onPray: (requestId: string, title: string) => void;
  onMarkAnswered: (requestId: string, title: string) => void;
  formatDate: (date: string) => string;
}

function PrayerCardComponent({
  request,
  index,
  isOwner,
  isPraying,
  isMarking,
  onPray,
  onMarkAnswered,
  formatDate,
}: PrayerCardProps) {
  const catStyle = CATEGORY_COLORS[request.category] || CATEGORY_COLORS.other;

  const handlePray = useCallback(() => {
    onPray(request._id, request.title);
  }, [onPray, request._id, request.title]);

  const handleMarkAnswered = useCallback(() => {
    onMarkAnswered(request._id, request.title);
  }, [onMarkAnswered, request._id, request.title]);

  return (
    <Animated.View
      entering={PMotionV10.cardStagger(index)}
      exiting={PMotionV10.screenFadeOut}
      className="mb-4 rounded-[20px]"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      <View className="rounded-[20px] bg-white overflow-hidden">
        {/* Category accent bar */}
        <View className="h-1" style={{ backgroundColor: catStyle.accent }} />

        {/* Content */}
        <View className="p-5">
          {/* Header row */}
          <View className="flex-row justify-between items-start mb-3.5">
            <View className="flex-row items-center">
              <View className="w-10 h-10 rounded-[20px] bg-neutral-100 items-center justify-center mr-3">
                <User size={16} color={Colors.neutral[400]} />
              </View>
              <View>
                <Text className="text-[15px] font-semibold text-neutral-800" numberOfLines={1}>
                  {request.is_anonymous ? 'Anonymous' : request.member_name}
                </Text>
                <Text className="text-[13px] text-neutral-500 mt-0.5">
                  {formatDate(request.created_at)}
                </Text>
              </View>
            </View>

            {/* Status badge */}
            {request.is_answered && (
              <View className="flex-row items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50">
                <CheckCircle size={12} color={Colors.success} />
                <Text className="text-xs font-semibold text-emerald-600">Answered</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text className="text-lg font-bold text-neutral-900 mb-2 tracking-tight" numberOfLines={2}>
            {request.title}
          </Text>

          {/* Description */}
          <Text className="text-[15px] text-neutral-600 leading-[22px] mb-3.5" numberOfLines={3}>
            {request.description}
          </Text>

          {/* Category tag */}
          <View className={`self-start px-3 py-1.5 rounded-[14px] mb-4 ${catStyle.bg}`}>
            <Text className={`text-xs font-semibold ${catStyle.text}`}>
              {request.category.charAt(0).toUpperCase() + request.category.slice(1)}
            </Text>
          </View>

          {/* Footer */}
          <View className="flex-row justify-between items-center pt-3.5 border-t border-neutral-100">
            {/* Prayer count */}
            <View className="flex-row items-center gap-1.5">
              <Heart
                size={16}
                color={Colors.accent.primary}
                fill={request.prayer_count > 0 ? Colors.accent.primary : 'transparent'}
              />
              <Text className="text-sm font-medium text-neutral-600">
                {request.prayer_count} {request.prayer_count === 1 ? 'prayer' : 'prayers'}
              </Text>
            </View>

            {/* Action button - always visible for non-answered prayers */}
            {!request.is_answered && (
              <>
                {isOwner ? (
                  <Pressable
                    onPress={handleMarkAnswered}
                    disabled={isMarking}
                    accessible
                    accessibilityRole="button"
                    accessibilityLabel="Mark prayer request as answered"
                    className="flex-row items-center gap-1.5 border-[1.5px] border-[#7FB685] px-3.5 py-2 rounded-xl active:scale-[0.97] active:opacity-90"
                  >
                    <Sparkles size={16} color={Colors.accent.sage} />
                    <Text className="text-[13px] font-semibold text-[#7FB685]">Mark Answered</Text>
                  </Pressable>
                ) : request.has_prayed ? (
                  <View className="flex-row items-center gap-1.5 bg-[#E8B86D] px-3.5 py-2 rounded-xl">
                    <Heart size={14} color={Colors.white} fill={Colors.white} />
                    <Text className="text-[13px] font-semibold text-white">Prayed</Text>
                  </View>
                ) : (
                  <Button
                    size="sm"
                    onPress={handlePray}
                    isDisabled={isPraying}
                    className="rounded-[20px] px-5"
                  >
                    <HandHeart size={18} color={Colors.white} />
                    <ButtonText className="ml-2 font-bold">Pray for this</ButtonText>
                  </Button>
                )}
              </>
            )}
          </View>

          {/* Testimony (if answered) */}
          {request.is_answered && request.answered_testimony && (
            <View className="mt-4 p-4 bg-emerald-50 rounded-[14px] border-l-[3px] border-emerald-500">
              <View className="flex-row items-center gap-1.5 mb-2">
                <Sparkles size={14} color={Colors.success} />
                <Text className="text-xs font-bold text-emerald-600 uppercase tracking-wide">
                  Testimony
                </Text>
              </View>
              <Text className="text-sm text-emerald-800 leading-5 italic">
                {request.answered_testimony}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

// Memoize with custom comparison - only re-render if critical props change
export const PrayerCard = memo(PrayerCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.request._id === nextProps.request._id &&
    prevProps.request.prayer_count === nextProps.request.prayer_count &&
    prevProps.request.has_prayed === nextProps.request.has_prayed &&
    prevProps.request.is_answered === nextProps.request.is_answered &&
    prevProps.request.answered_testimony === nextProps.request.answered_testimony &&
    prevProps.index === nextProps.index &&
    prevProps.isOwner === nextProps.isOwner &&
    prevProps.isPraying === nextProps.isPraying &&
    prevProps.isMarking === nextProps.isMarking
  );
});

PrayerCard.displayName = 'PrayerCard';

export default PrayerCard;
