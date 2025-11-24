/**
 * Search Results Component
 *
 * Displays search results grouped by status:
 * - Attended
 * - RSVP'd
 * - Upcoming
 *
 * Features staggered card animations
 */

import React from 'react';
import { View, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Calendar, MapPin } from 'lucide-react-native';
import { format } from 'date-fns';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { EventStatusBadge } from './EventStatusBadge';
import { FilteredEvent } from '@/utils/eventFilters';
import { EventStatus } from '@/utils/eventStatus';
import { colors, shadows } from '@/constants/theme';

interface SearchResultsProps {
  groupedResults: {
    attended: FilteredEvent[];
    rsvp: FilteredEvent[];
    upcoming: FilteredEvent[];
  };
  counts: {
    attended: number;
    rsvp: number;
    upcoming: number;
    total: number;
  };
}

interface StatusSection {
  status: EventStatus;
  events: FilteredEvent[];
  count: number;
}

export function SearchResults({ groupedResults, counts }: SearchResultsProps) {
  const { t } = useTranslation();
  const router = useRouter();

  // Build flat list with section headers
  const sections: StatusSection[] = [
    { status: 'attended', events: groupedResults.attended, count: counts.attended },
    { status: 'rsvp', events: groupedResults.rsvp, count: counts.rsvp },
    { status: 'upcoming', events: groupedResults.upcoming, count: counts.upcoming },
  ].filter((section) => section.count > 0); // Only show non-empty sections

  const handleEventPress = (eventId: string) => {
    router.push(`/events/${eventId}` as any);
  };

  const renderItem = ({ item, index }: { item: StatusSection | FilteredEvent; index: number }) => {
    // Section header
    if ('status' in item && 'count' in item) {
      const section = item as StatusSection;
      return (
        <MotiView
          from={{ opacity: 0, translateY: -10 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 250, delay: index * 40 }}
          className="px-4 pt-4 pb-2"
        >
          <HStack space="sm" className="items-center">
            <EventStatusBadge status={section.status} size="md" delay={0} />
            <Text className="text-gray-500 text-sm">({section.count})</Text>
          </HStack>
        </MotiView>
      );
    }

    // Event card
    const event = item as FilteredEvent;
    const eventDate = new Date(event.date);

    return (
      <MotiView
        from={{ opacity: 0, translateY: 10 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{
          type: 'timing',
          duration: 250,
          delay: index * 40,
        }}
        className="px-4 pb-3"
      >
        <Pressable
          onPress={() => handleEventPress(event.id)}
          className="active:opacity-70"
        >
          <View
            className="p-4 rounded-2xl bg-white border border-gray-100"
            style={shadows.sm}
          >
            <VStack space="sm">
              {/* Title & Badge */}
              <HStack space="sm" className="items-start justify-between">
                <Text className="text-base font-bold text-gray-900 flex-1">
                  {event.title}
                </Text>
                <EventStatusBadge status={event.status} delay={0} />
              </HStack>

              {/* Date & Location */}
              <VStack space="xs">
                <HStack space="sm" className="items-center">
                  <Icon as={Calendar} size="sm" className="text-gray-500" />
                  <Text className="text-sm text-gray-600">
                    {format(eventDate, 'MMM d, yyyy • h:mm a')}
                  </Text>
                </HStack>

                {event.location && (
                  <HStack space="sm" className="items-center">
                    <Icon as={MapPin} size="sm" className="text-gray-500" />
                    <Text className="text-sm text-gray-600" numberOfLines={1}>
                      {event.location}
                    </Text>
                  </HStack>
                )}
              </VStack>

              {/* Description Preview */}
              {event.description && (
                <Text className="text-sm text-gray-500" numberOfLines={2}>
                  {event.description}
                </Text>
              )}
            </VStack>
          </View>
        </Pressable>
      </MotiView>
    );
  };

  // Flatten sections and events into single array
  const flatData: (StatusSection | FilteredEvent)[] = sections.reduce(
    (acc, section) => [...acc, section, ...section.events],
    [] as (StatusSection | FilteredEvent)[]
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlashList
        data={flatData}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          'status' in item && 'count' in item
            ? `section-${item.status}`
            : `event-${(item as FilteredEvent).id}`
        }
        estimatedItemSize={120}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
      />
    </View>
  );
}
