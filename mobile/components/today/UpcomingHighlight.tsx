/**
 * UpcomingHighlight - Next Event Card (Memoized)
 *
 * Extracted from Today screen for performance optimization.
 * Features:
 * - Shows next upcoming event
 * - Date block with day/month
 * - Event name and time
 * - Navigate to event detail
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { PremiumCard2 } from '@/components/ui/premium-card';
import type { EventWithMemberStatus } from '@/types/events';

// Premium monochrome palette
const Colors = {
  accent: {
    dark: '#9A7B3D',
  },
};

interface UpcomingHighlightProps {
  upcomingEvents: EventWithMemberStatus[] | null | undefined;
}

function UpcomingHighlightComponent({ upcomingEvents }: UpcomingHighlightProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const handleSeeAll = useCallback(() => {
    router.push('/(tabs)/events');
  }, [router]);

  const handleEventPress = useCallback(
    (eventId: string) => {
      router.push(`/events/${eventId}` as `/events/${string}`);
    },
    [router]
  );

  if (!upcomingEvents || upcomingEvents.length === 0) return null;

  const nextEvent = upcomingEvents[0];
  const eventDate = new Date(
    nextEvent.event_date || nextEvent.sessions?.[0]?.date || new Date()
  );

  return (
    <View className="mb-6">
      <View className="flex-row justify-between items-center mb-4">
        <Text
          className="text-xl font-bold text-typography-900"
          style={{ letterSpacing: -0.3 }}
        >
          {t('today.comingUp', 'Coming Up')}
        </Text>
        <Pressable
          onPress={handleSeeAll}
          accessible
          accessibilityRole="button"
          accessibilityLabel="See all upcoming events"
        >
          <Text
            className="text-sm font-semibold"
            style={{ color: Colors.accent.dark }}
          >
            {t('common.seeAll', 'See All')}
          </Text>
        </Pressable>
      </View>

      <PremiumCard2
        onPress={() => handleEventPress(nextEvent.id)}
        innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
      >
        <View className="w-14 h-[60px] rounded-xl bg-background-100 items-center justify-center">
          <Text className="text-2xl font-bold text-typography-900">
            {eventDate.getDate()}
          </Text>
          <Text
            className="text-[11px] font-semibold text-typography-500"
            style={{ letterSpacing: 0.5 }}
          >
            {eventDate
              .toLocaleDateString('en-US', { month: 'short' })
              .toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <Text
            className="text-base font-semibold text-typography-900"
            numberOfLines={1}
          >
            {nextEvent.name}
          </Text>
          <Text className="text-sm text-typography-500 mt-1">
            {eventDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}
          </Text>
        </View>
        <ChevronRight size={20} color="#A3A3A3" />
      </PremiumCard2>
    </View>
  );
}

export const UpcomingHighlight = memo(UpcomingHighlightComponent);
UpcomingHighlight.displayName = 'UpcomingHighlight';
