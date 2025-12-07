/**
 * EventCard - Reusable Event Card Component
 *
 * Premium card design with:
 * - Event image or gradient
 * - Date/time badges
 * - Category tags
 * - RSVP/Cancel/Rating actions
 * - Share functionality
 *
 * Styling: NativeWind-first with inline style for shadows/spacing constants
 */

import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  Calendar,
  MapPin,
  Users,
  Check,
  X,
  Share2,
  Clock,
  Star,
  Edit3,
  CalendarDays,
  CheckCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import type { Router } from 'expo-router';
import type { TFunction } from 'i18next';

import { PremiumCard3 } from '@/components/ui/premium-card';
import type { EventWithMemberStatus } from '@/types/events';
import { formatDateShort, formatTimeShort } from '@/utils/dateFormat';
import { spacing, radius } from '@/constants/spacing';

// Colors
const Colors = {
  gradient: {
    start: '#1a1a2e',
    end: '#0f3460',
  },
  accent: {
    primary: '#d4af37',
    dark: '#b8860b',
  },
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    800: '#262626',
    900: '#171717',
  },
  white: '#ffffff',
  success: '#22c55e',
  error: '#ef4444',
  primary: {
    500: '#3b82f6',
  },
};

type Tab = 'upcoming' | 'my_rsvps' | 'attended';

interface EventCategory {
  id: string;
  name: string;
  color?: string;
}

interface EventCardProps {
  event: EventWithMemberStatus;
  activeTab: Tab;
  categories: EventCategory[];
  onRSVP: (eventId: string) => void;
  onCancelRSVP: (eventId: string) => void;
  onShare: (event: EventWithMemberStatus) => void;
  onOpenRating: (event: EventWithMemberStatus, existingRating?: number, existingReview?: string) => void;
  getEventRating: (eventId: string) => { rated: boolean; rating?: number; review?: string };
  t: TFunction;
  router: Router;
  isRSVPPending?: boolean;
  isCancelPending?: boolean;
}

function EventCardComponent({
  event,
  activeTab,
  categories,
  onRSVP,
  onCancelRSVP,
  onShare,
  onOpenRating,
  getEventRating,
  t,
  router,
  isRSVPPending = false,
  isCancelPending = false,
}: EventCardProps) {
  const showRSVPButton = activeTab === 'upcoming' && event.requires_rsvp && event.can_rsvp;
  const showNoRSVPNeeded = activeTab === 'upcoming' && !event.requires_rsvp;
  const showCancelButton = activeTab === 'my_rsvps' && event.my_rsvp;
  const showAttendedBadge = activeTab === 'attended' && event.my_attendance;
  const ratingData = activeTab === 'attended' ? getEventRating(event.id) : null;

  const getCategoryColor = (categoryId?: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || Colors.primary[500];
  };

  return (
    <View style={{ marginBottom: spacing.m }}>
      <PremiumCard3
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push(`/events/${event.id}` as any);
        }}
        innerStyle={{ padding: 0, overflow: 'hidden' }}
      >
        {/* Event Image or Gradient */}
        <View
          className="h-40 relative overflow-hidden"
          style={{ borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card }}
        >
          {event.event_photo ? (
            <Image
              source={{ uri: event.event_photo }}
              className="w-full h-full"
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
              placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4"
              placeholderContentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[Colors.gradient.start, Colors.gradient.end]}
              className="w-full h-full"
            />
          )}
          {/* Date Badge */}
          <View
            className="absolute flex-row items-center bg-white"
            style={{
              top: spacing.sm,
              left: spacing.sm,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.s,
              borderRadius: radius.s,
              gap: spacing.xs,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Calendar size={14} color={Colors.gradient.start} />
            <Text className="text-[13px] font-bold" style={{ color: Colors.gradient.start }}>
              {formatDateShort(event.event_date)}
            </Text>
          </View>
          {/* Attended Badge */}
          {showAttendedBadge && (
            <View
              className="absolute flex-row items-center"
              style={{
                bottom: spacing.sm,
                left: spacing.sm,
                backgroundColor: Colors.success,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
                borderRadius: radius.s,
                gap: spacing.xs,
              }}
            >
              <CheckCircle size={14} color={Colors.white} />
              <Text className="text-xs font-bold text-white">{t('events.attended')}</Text>
            </View>
          )}
          {/* Sessions Badge for Series Events */}
          {(event.event_type === 'series' || (event.sessions && event.sessions.length > 0)) && (
            <View
              className="absolute flex-row items-center"
              style={{
                top: spacing.sm,
                right: spacing.sm,
                backgroundColor: Colors.gradient.end,
                paddingHorizontal: spacing.s,
                paddingVertical: spacing.xs,
                borderRadius: radius.s,
                gap: spacing.xs,
              }}
            >
              <CalendarDays size={14} color={Colors.white} />
              <Text className="text-xs font-bold text-white">
                {event.sessions && event.sessions.length > 0
                  ? `${event.sessions.length} ${t('events.sessions')}`
                  : t('events.series')}
              </Text>
            </View>
          )}
        </View>

        {/* Event Content */}
        <View style={{ padding: spacing.m }}>
          {/* Category Tag */}
          {event.event_category_id && (
            <View
              className="flex-row items-center self-start"
              style={{
                backgroundColor: getCategoryColor(event.event_category_id) + '20',
                paddingHorizontal: spacing.s,
                paddingVertical: spacing.xs,
                borderRadius: radius.s,
                marginBottom: spacing.s,
                gap: spacing.xs,
              }}
            >
              <View
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: getCategoryColor(event.event_category_id) }}
              />
              <Text
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: getCategoryColor(event.event_category_id) }}
              >
                {categories.find((c) => c.id === event.event_category_id)?.name || ''}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text
            className="text-lg font-bold text-neutral-900 leading-6"
            numberOfLines={2}
            style={{ marginBottom: spacing.sm }}
          >
            {event.name}
          </Text>

          {/* Meta Info */}
          <View style={{ gap: spacing.s, marginBottom: spacing.s }}>
            {event.event_date && (
              <View className="flex-row items-center" style={{ gap: spacing.s }}>
                <Clock size={14} color={Colors.neutral[500]} />
                <Text className="text-[13px] text-neutral-600">
                  {formatTimeShort(event.event_date)}
                  {event.event_end_date && ` - ${formatTimeShort(event.event_end_date)}`}
                </Text>
              </View>
            )}
            {event.location && (
              <View className="flex-row items-center flex-1" style={{ gap: spacing.s }}>
                <MapPin size={14} color={Colors.neutral[500]} />
                <Text className="text-[13px] text-neutral-600 flex-1" numberOfLines={1}>
                  {event.location}
                </Text>
              </View>
            )}
          </View>

          {/* Attendees */}
          {event.max_attendees && (
            <View
              className="flex-row items-center"
              style={{ gap: spacing.s, marginBottom: spacing.sm }}
            >
              <Users size={14} color={Colors.accent.primary} />
              <Text className="text-[13px] font-semibold" style={{ color: Colors.accent.dark }}>
                {event.attendee_count || 0} / {event.max_attendees} {t('events.attendees')}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View
            className="flex-row items-center border-t border-neutral-100"
            style={{ gap: spacing.s, paddingTop: spacing.sm }}
          >
            {showRSVPButton && (
              <Pressable
                onPress={() => onRSVP(event.id)}
                className={`flex-1 flex-row items-center justify-center ${isRSVPPending ? 'opacity-50' : ''}`}
                style={{
                  backgroundColor: Colors.gradient.end,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.m,
                  gap: spacing.s,
                }}
                disabled={isRSVPPending || !event.can_rsvp}
              >
                <Check size={16} color={Colors.white} />
                <Text className="text-sm font-bold text-white">{t('events.rsvp')}</Text>
              </Pressable>
            )}

            {showNoRSVPNeeded && (
              <View
                className="flex-1 flex-row items-center justify-center bg-neutral-100"
                style={{ paddingVertical: spacing.sm, borderRadius: radius.m, gap: spacing.s }}
              >
                <Calendar size={16} color={Colors.neutral[400]} />
                <Text className="text-sm font-semibold text-neutral-400">
                  {t('events.noRsvpNeeded')}
                </Text>
              </View>
            )}

            {showCancelButton && (
              <Pressable
                onPress={() => onCancelRSVP(event.id)}
                className={`flex-1 flex-row items-center justify-center bg-neutral-50 border-[1.5px] ${isCancelPending ? 'opacity-50' : ''}`}
                style={{
                  borderColor: Colors.error,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.m,
                  gap: spacing.s,
                }}
                disabled={isCancelPending}
              >
                <X size={16} color={Colors.error} />
                <Text className="text-sm font-semibold" style={{ color: Colors.error }}>
                  {t('events.cancelRSVP')}
                </Text>
              </Pressable>
            )}

            {activeTab === 'attended' && ratingData && (
              ratingData.rated ? (
                <View className="flex-1 flex-row items-center justify-between">
                  <View className="flex-row items-center" style={{ gap: spacing.xs }}>
                    <Star size={14} color={Colors.accent.primary} fill={Colors.accent.primary} />
                    <Text className="text-sm font-bold text-neutral-800">
                      {ratingData.rating}/10
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => onOpenRating(event, ratingData.rating, ratingData.review)}
                    className="w-9 h-9 items-center justify-center bg-neutral-100"
                    style={{ borderRadius: radius.s }}
                  >
                    <Edit3 size={14} color={Colors.neutral[600]} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => onOpenRating(event)}
                  className="flex-1 flex-row items-center justify-center"
                  style={{
                    backgroundColor: Colors.accent.primary,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.m,
                    gap: spacing.s,
                  }}
                >
                  <Star size={16} color={Colors.white} />
                  <Text className="text-sm font-bold text-white">{t('events.rateEvent')}</Text>
                </Pressable>
              )
            )}

            <Pressable
              onPress={() => onShare(event)}
              className="w-11 h-11 items-center justify-center bg-neutral-100"
              style={{ borderRadius: radius.m }}
            >
              <Share2 size={18} color={Colors.gradient.end} />
            </Pressable>
          </View>
        </View>
      </PremiumCard3>
    </View>
  );
}

export const EventCard = memo(EventCardComponent);

export default EventCard;
