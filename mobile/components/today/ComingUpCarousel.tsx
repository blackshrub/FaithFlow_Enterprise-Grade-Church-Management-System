/**
 * ComingUpCarousel - Upcoming Events Horizontal Carousel
 *
 * Premium carousel showing upcoming church events.
 * Features:
 * - 42% width cards (shows 2.4 cards visible)
 * - Date badge with stacked month/day
 * - RSVP button for eligible events
 * - "See all" link to Events tab
 * - HIDES section if no events
 *
 * Styling: NativeWind-first with inline styles for shadows/animations
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  Pressable,
  FlatList,
  Dimensions,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { Calendar, MapPin, Clock, ChevronRight, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { PMotion } from '@/components/motion/premium-motion';
import type { EventWithMemberStatus } from '@/types/events';

// Dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.42;
const CARD_GAP = 12;
const PADDING_HORIZONTAL = 20;

// Colors
const Colors = {
  accent: {
    primary: '#C9A962',
    light: '#E8D5A8',
  },
  success: '#22C55E',
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    400: '#A3A3A3',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ComingUpCarouselProps {
  events: EventWithMemberStatus[];
  onRSVP?: (eventId: string) => void;
  focusKey?: number | string;
}

export const ComingUpCarousel = memo(function ComingUpCarousel({
  events,
  onRSVP,
  focusKey = 0,
}: ComingUpCarouselProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Don't render if no events
  if (!events || events.length === 0) {
    return null;
  }

  // Limit to 5 events
  const displayEvents = events.slice(0, 5);

  const handleSeeAll = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/events');
  }, [router]);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<EventWithMemberStatus>) => (
      <EventCard
        event={item}
        index={index}
        isLast={index === displayEvents.length - 1}
        onRSVP={onRSVP}
      />
    ),
    [displayEvents.length, onRSVP]
  );

  const keyExtractor = useCallback(
    (item: EventWithMemberStatus) => item.id,
    []
  );

  return (
    <Animated.View
      key={`coming-up-${focusKey}`}
      entering={PMotion.sectionStagger(2)}
      className="mb-6"
    >
      {/* Section Header */}
      <View className="flex-row items-center justify-between mb-3 px-5">
        <View className="flex-row items-center gap-2">
          <Calendar size={16} color={Colors.accent.primary} />
          <Text
            className="text-[13px] font-semibold text-typography-500 uppercase"
            style={{ letterSpacing: 1 }}
          >
            {t('today.comingUp', 'Coming Up')}
          </Text>
        </View>

        <Pressable
          onPress={handleSeeAll}
          className="flex-row items-center gap-1"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="See all upcoming events"
        >
          <Text className="text-[13px] font-medium text-primary-500">
            {t('common.seeAll', 'See all')}
          </Text>
          <ChevronRight size={14} color="#3B82F6" />
        </Pressable>
      </View>

      {/* Carousel */}
      <FlatList
        data={displayEvents}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        bounces={false}
      />
    </Animated.View>
  );
});

// =============================================================================
// EVENT CARD COMPONENT
// =============================================================================

interface EventCardProps {
  event: EventWithMemberStatus;
  index: number;
  isLast: boolean;
  onRSVP?: (eventId: string) => void;
}

const EventCard = memo(function EventCard({
  event,
  index,
  isLast,
  onRSVP,
}: EventCardProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const scale = useSharedValue(1);

  // Parse event date
  const eventDate = event.event_date ? new Date(event.event_date) : null;
  const monthStr = eventDate
    ? eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
    : '';
  const dayStr = eventDate ? eventDate.getDate().toString() : '';
  const timeStr = eventDate
    ? eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : '';

  // Check if user has RSVP'd
  const hasRSVP = !!event.my_rsvp;
  const canRSVP = event.can_rsvp && event.requires_rsvp;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/events/${event.id}`);
  }, [router, event.id]);

  const handleRSVP = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRSVP?.(event.id);
  }, [onRSVP, event.id]);

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.card,
        {
          width: CARD_WIDTH,
          marginLeft: index === 0 ? PADDING_HORIZONTAL : CARD_GAP / 2,
          marginRight: isLast ? PADDING_HORIZONTAL : CARD_GAP / 2,
        },
        animatedStyle,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Event: ${event.name}, ${monthStr} ${dayStr}, tap to view details`}
    >
      {/* Date Badge */}
      <View style={styles.dateBadge}>
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.monthText}>{monthStr}</Text>
        <Text style={styles.dayText}>{dayStr}</Text>
      </View>

      {/* Event Name */}
      <Text
        style={styles.eventName}
        numberOfLines={2}
      >
        {event.name}
      </Text>

      {/* Time */}
      {timeStr && (
        <View style={styles.metaRow}>
          <Clock size={12} color={Colors.neutral[400]} />
          <Text style={styles.metaText}>{timeStr}</Text>
        </View>
      )}

      {/* Location */}
      {event.location && (
        <View style={styles.metaRow}>
          <MapPin size={12} color={Colors.neutral[400]} />
          <Text style={styles.metaText} numberOfLines={1}>
            {event.location}
          </Text>
        </View>
      )}

      {/* RSVP Button */}
      {(canRSVP || hasRSVP) && (
        <Pressable
          onPress={hasRSVP ? undefined : handleRSVP}
          disabled={hasRSVP}
          style={[
            styles.rsvpButton,
            hasRSVP ? styles.rsvpButtonConfirmed : styles.rsvpButtonPrimary,
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={hasRSVP ? 'RSVP confirmed' : 'RSVP to this event'}
        >
          {hasRSVP && <Check size={14} color="#FFFFFF" />}
          <Text style={styles.rsvpButtonText}>
            {hasRSVP
              ? t('events.confirmed', 'Confirmed')
              : t('events.rsvp', 'RSVP')}
          </Text>
        </Pressable>
      )}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  listContent: {
    alignItems: 'stretch',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 160,
  },
  dateBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
  },
  monthText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dayText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  eventName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[800],
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.neutral[600],
    flex: 1,
  },
  rsvpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 'auto',
  },
  rsvpButtonPrimary: {
    backgroundColor: Colors.accent.primary,
  },
  rsvpButtonConfirmed: {
    backgroundColor: Colors.success,
  },
  rsvpButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
