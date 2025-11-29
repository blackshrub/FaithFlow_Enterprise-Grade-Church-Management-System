/**
 * PrayerCard - Memoized Prayer Request Card Component
 *
 * Performance optimizations:
 * - React.memo prevents unnecessary re-renders
 * - useCallback for all event handlers
 * - Stable prop references via memoization
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import {
  Heart,
  User,
  CheckCircle,
  Sparkles,
  HandHeart,
} from 'lucide-react-native';

import { PMotionV10 } from '@/components/motion/premium-motion';
import { spacing } from '@/constants/theme';
import type { PrayerRequestWithStatus } from '@/types/prayer';

// Premium color palette - spiritual, calming
const Colors = {
  gradient: {
    start: '#1e3a5f',
    mid: '#2d4a6f',
    end: '#3d5a7f',
  },
  accent: {
    primary: '#E8B86D',
    light: '#F5D9A8',
    rose: '#E8A0BF',
    sage: '#7FB685',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  success: '#10B981',
  white: '#FFFFFF',
};

// Category colors - muted, sophisticated
const CATEGORY_COLORS: Record<string, { bg: string; text: string; accent: string }> = {
  health: { bg: '#FEF2F2', text: '#991B1B', accent: '#DC2626' },
  family: { bg: '#FDF4FF', text: '#86198F', accent: '#C026D3' },
  financial: { bg: '#F0FDF4', text: '#166534', accent: '#16A34A' },
  spiritual: { bg: '#EFF6FF', text: '#1E40AF', accent: '#2563EB' },
  work: { bg: '#FFFBEB', text: '#92400E', accent: '#D97706' },
  relationships: { bg: '#FDF2F8', text: '#9D174D', accent: '#DB2777' },
  guidance: { bg: '#F0F9FF', text: '#075985', accent: '#0284C7' },
  thanksgiving: { bg: '#FEF3C7', text: '#92400E', accent: '#F59E0B' },
  other: { bg: '#F4F4F5', text: '#3F3F46', accent: '#71717A' },
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
      style={styles.prayerCardShadowWrapper}
    >
      <View style={styles.prayerCardBorderWrapper}>
        <View style={styles.prayerInnerContainer}>
          {/* Category accent */}
          <View style={[styles.cardAccent, { backgroundColor: catStyle.accent }]} />

          {/* Content */}
          <View style={styles.cardContent}>
            {/* Header row */}
            <View style={styles.cardHeader}>
              <View style={styles.authorInfo}>
                <View style={styles.authorAvatar}>
                  <User size={16} color={Colors.neutral[400]} />
                </View>
                <View>
                  <Text style={styles.authorName}>
                    {request.is_anonymous ? 'Anonymous' : request.member_name}
                  </Text>
                  <Text style={styles.cardDate}>
                    {formatDate(request.created_at)}
                  </Text>
                </View>
              </View>

              {/* Status badge */}
              {request.is_answered && (
                <View style={styles.answeredBadge}>
                  <CheckCircle size={12} color={Colors.success} />
                  <Text style={styles.answeredText}>Answered</Text>
                </View>
              )}
            </View>

            {/* Title */}
            <Text style={styles.cardTitle}>{request.title}</Text>

            {/* Description */}
            <Text style={styles.cardDesc} numberOfLines={3}>
              {request.description}
            </Text>

            {/* Category tag */}
            <View style={[styles.categoryTag, { backgroundColor: catStyle.bg }]}>
              <Text style={[styles.categoryText, { color: catStyle.text }]}>
                {request.category.charAt(0).toUpperCase() + request.category.slice(1)}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              {/* Prayer count */}
              <View style={styles.prayerCount}>
                <Heart size={16} color={Colors.accent.primary} fill={request.prayer_count > 0 ? Colors.accent.primary : 'transparent'} />
                <Text style={styles.prayerCountText}>
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
                      style={({ pressed }) => [
                        styles.markAnsweredBtn,
                        pressed && styles.pressedMicro,
                      ]}
                    >
                      <Sparkles size={16} color={Colors.accent.sage} />
                      <Text style={styles.markAnsweredText}>Mark Answered</Text>
                    </Pressable>
                  ) : request.has_prayed ? (
                    <View style={styles.prayedBadge}>
                      <Heart size={14} color={Colors.white} fill={Colors.white} />
                      <Text style={styles.prayedText}>Prayed</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handlePray}
                      disabled={isPraying}
                      style={({ pressed }) => [
                        styles.prayBtn,
                        pressed && styles.pressedMicro,
                        isPraying && styles.prayBtnDisabled,
                      ]}
                    >
                      <HandHeart size={18} color={Colors.white} />
                      <Text style={styles.prayBtnText}>Pray for this</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>

            {/* Testimony (if answered) */}
            {request.is_answered && request.answered_testimony && (
              <View style={styles.testimonyBox}>
                <View style={styles.testimonyHeader}>
                  <Sparkles size={14} color={Colors.success} />
                  <Text style={styles.testimonyLabel}>Testimony</Text>
                </View>
                <Text style={styles.testimonyText}>
                  {request.answered_testimony}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// Memoize with custom comparison - only re-render if critical props change
export const PrayerCard = memo(PrayerCardComponent, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
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

const styles = StyleSheet.create({
  // Micro-interaction for pressed state
  pressedMicro: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  // Layer 1: Shadow wrapper
  prayerCardShadowWrapper: {
    marginBottom: spacing.md,
    borderRadius: spacing.md + spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: spacing.xs },
    shadowOpacity: 0.06,
    shadowRadius: spacing.sm + spacing.xs,
    elevation: 3,
  },
  // Layer 2: Border wrapper
  prayerCardBorderWrapper: {
    borderRadius: spacing.md + spacing.xs,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  // Layer 3: Inner container
  prayerInnerContainer: {
    borderRadius: spacing.md + spacing.xs,
    overflow: 'hidden',
  },
  cardAccent: {
    height: spacing.xs,
  },
  cardContent: {
    padding: spacing.md + spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md - 2,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: spacing.md + spacing.xs,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + spacing.xs,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  cardDate: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  answeredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: spacing.sm + spacing.xs,
    backgroundColor: '#ECFDF5',
  },
  answeredText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 15,
    color: Colors.neutral[600],
    lineHeight: 22,
    marginBottom: spacing.md - 2,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: 5,
    borderRadius: spacing.md - 2,
    marginBottom: spacing.md,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md - 2,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  prayerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  prayerCountText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[600],
  },
  prayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: Colors.gradient.start,
    paddingHorizontal: spacing.md + 4, // 20
    paddingVertical: spacing.sm + 4, // 12
    borderRadius: spacing.md + spacing.xs, // 20
    shadowColor: Colors.gradient.start,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  prayBtnDisabled: {
    opacity: 0.6,
  },
  prayBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.2,
  },
  prayedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: Colors.accent.primary,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
  },
  prayedText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  markAnsweredBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderWidth: 1.5,
    borderColor: Colors.accent.sage,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm,
    borderRadius: spacing.md,
  },
  markAnsweredText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent.sage,
  },
  // Testimony
  testimonyBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: '#F0FDF4',
    borderRadius: spacing.md - 2,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  testimonyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.sm,
  },
  testimonyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.success,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  testimonyText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

export default PrayerCard;
