/**
 * EventCard - Reusable Event Card Component
 *
 * Premium card design with:
 * - Event image or gradient
 * - Date/time badges
 * - Category tags
 * - RSVP/Cancel/Rating actions
 * - Share functionality
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
        <View style={styles.eventImageWrap}>
          {event.event_photo ? (
            <Image
              source={{ uri: event.event_photo }}
              style={styles.eventImage}
              contentFit="cover"
            />
          ) : (
            <LinearGradient
              colors={[Colors.gradient.start, Colors.gradient.end]}
              style={styles.eventImage}
            />
          )}
          {/* Date Badge */}
          <View style={styles.dateBadge}>
            <Calendar size={14} color={Colors.gradient.start} />
            <Text style={styles.dateBadgeText}>{formatDateShort(event.event_date)}</Text>
          </View>
          {/* Attended Badge */}
          {showAttendedBadge && (
            <View style={styles.attendedBadge}>
              <CheckCircle size={14} color={Colors.white} />
              <Text style={styles.attendedBadgeText}>{t('events.attended')}</Text>
            </View>
          )}
          {/* Sessions Badge for Series Events */}
          {(event.event_type === 'series' || (event.sessions && event.sessions.length > 0)) && (
            <View style={styles.sessionsBadge}>
              <CalendarDays size={14} color={Colors.white} />
              <Text style={styles.sessionsBadgeText}>
                {event.sessions && event.sessions.length > 0
                  ? `${event.sessions.length} ${t('events.sessions')}`
                  : t('events.series')}
              </Text>
            </View>
          )}
        </View>

        {/* Event Content */}
        <View style={styles.eventContent}>
          {/* Category Tag */}
          {event.event_category_id && (
            <View style={[styles.categoryTag, { backgroundColor: getCategoryColor(event.event_category_id) + '20' }]}>
              <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(event.event_category_id) }]} />
              <Text style={[styles.categoryText, { color: getCategoryColor(event.event_category_id) }]}>
                {categories.find((c) => c.id === event.event_category_id)?.name || ''}
              </Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.eventTitle} numberOfLines={2}>{event.name}</Text>

          {/* Meta Info */}
          <View style={styles.metaRow}>
            {event.event_date && (
              <View style={styles.metaItem}>
                <Clock size={14} color={Colors.neutral[500]} />
                <Text style={styles.metaText}>
                  {formatTimeShort(event.event_date)}
                  {event.event_end_date && ` - ${formatTimeShort(event.event_end_date)}`}
                </Text>
              </View>
            )}
            {event.location && (
              <View style={styles.metaItem}>
                <MapPin size={14} color={Colors.neutral[500]} />
                <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
              </View>
            )}
          </View>

          {/* Attendees */}
          {event.max_attendees && (
            <View style={styles.attendeesRow}>
              <Users size={14} color={Colors.accent.primary} />
              <Text style={styles.attendeesText}>
                {event.attendee_count || 0} / {event.max_attendees} {t('events.attendees')}
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            {showRSVPButton && (
              <Pressable
                onPress={() => onRSVP(event.id)}
                style={[styles.rsvpBtn, isRSVPPending && styles.btnDisabled]}
                disabled={isRSVPPending || !event.can_rsvp}
              >
                <Check size={16} color={Colors.white} />
                <Text style={styles.rsvpBtnText}>{t('events.rsvp')}</Text>
              </Pressable>
            )}

            {showNoRSVPNeeded && (
              <View style={styles.noRsvpBtn}>
                <Calendar size={16} color={Colors.neutral[400]} />
                <Text style={styles.noRsvpBtnText}>{t('events.noRsvpNeeded')}</Text>
              </View>
            )}

            {showCancelButton && (
              <Pressable
                onPress={() => onCancelRSVP(event.id)}
                style={[styles.cancelBtn, isCancelPending && styles.btnDisabled]}
                disabled={isCancelPending}
              >
                <X size={16} color={Colors.error} />
                <Text style={styles.cancelBtnText}>{t('events.cancelRSVP')}</Text>
              </Pressable>
            )}

            {activeTab === 'attended' && ratingData && (
              ratingData.rated ? (
                <View style={styles.ratingRow}>
                  <View style={styles.ratingDisplay}>
                    <Star size={14} color={Colors.accent.primary} fill={Colors.accent.primary} />
                    <Text style={styles.ratingValue}>{ratingData.rating}/10</Text>
                  </View>
                  <Pressable
                    onPress={() => onOpenRating(event, ratingData.rating, ratingData.review)}
                    style={styles.editRatingBtn}
                  >
                    <Edit3 size={14} color={Colors.neutral[600]} />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => onOpenRating(event)}
                  style={styles.rateBtn}
                >
                  <Star size={16} color={Colors.white} />
                  <Text style={styles.rateBtnText}>{t('events.rateEvent')}</Text>
                </Pressable>
              )
            )}

            <Pressable
              onPress={() => onShare(event)}
              style={styles.shareBtn}
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

const styles = StyleSheet.create({
  eventImageWrap: {
    height: 160,
    position: 'relative',
    overflow: 'hidden',
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
  },
  eventImage: {
    width: '100%',
    height: '100%',
  },
  dateBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.s,
    borderRadius: radius.s,
    gap: spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gradient.start,
  },
  attendedBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    gap: spacing.xs,
  },
  attendedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  sessionsBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gradient.end,
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    gap: spacing.xs,
  },
  sessionsBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  eventContent: {
    padding: spacing.m,
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.s,
    paddingVertical: spacing.xs,
    borderRadius: radius.s,
    marginBottom: spacing.s,
    gap: spacing.xs,
  },
  categoryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: spacing.sm,
    lineHeight: 24,
  },
  metaRow: {
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  metaText: {
    fontSize: 13,
    color: Colors.neutral[600],
    flex: 1,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.sm,
  },
  attendeesText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent.dark,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  rsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.gradient.end,
    paddingVertical: spacing.sm,
    borderRadius: radius.m,
    gap: spacing.s,
  },
  rsvpBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  noRsvpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[100],
    paddingVertical: spacing.sm,
    borderRadius: radius.m,
    gap: spacing.s,
  },
  noRsvpBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[400],
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[50],
    paddingVertical: spacing.sm,
    borderRadius: radius.m,
    borderWidth: 1.5,
    borderColor: Colors.error,
    gap: spacing.s,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
  },
  rateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent.primary,
    paddingVertical: spacing.sm,
    borderRadius: radius.m,
    gap: spacing.s,
  },
  rateBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  ratingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.neutral[800],
  },
  editRatingBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.s,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.m,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

export default EventCard;
