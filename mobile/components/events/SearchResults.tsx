/**
 * Search Results Component
 *
 * Displays search results with horizontal tabs:
 * - All
 * - Upcoming
 * - RSVP'd
 * - Attended
 *
 * Features staggered card animations and tab filtering
 */

import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Calendar, MapPin } from 'lucide-react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { EventStatusBadge } from './EventStatusBadge';
import { FilteredEvent } from '@/utils/eventFilters';
import { EventStatus } from '@/utils/eventStatus';
import { colors, shadows, borderRadius, spacing } from '@/constants/theme';

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

type FilterTab = 'all' | 'upcoming' | 'rsvp' | 'attended';

export function SearchResults({ groupedResults, counts }: SearchResultsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const handleEventPress = (eventId: string) => {
    router.push(`/events/${eventId}` as any);
  };

  const handleTabChange = (tab: FilterTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  // Get filtered events based on active tab
  const getFilteredEvents = (): FilteredEvent[] => {
    switch (activeTab) {
      case 'upcoming':
        return groupedResults.upcoming;
      case 'rsvp':
        return groupedResults.rsvp;
      case 'attended':
        return groupedResults.attended;
      case 'all':
      default:
        return [
          ...groupedResults.upcoming,
          ...groupedResults.rsvp,
          ...groupedResults.attended,
        ];
    }
  };

  const filteredEvents = getFilteredEvents();

  const renderItem = ({ item: event, index }: { item: FilteredEvent; index: number }) => {
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

  return (
    <View style={{ flex: 1 }}>
      {/* Horizontal Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 12 }}
      >
        <HStack space="xs">
          {/* All Tab */}
          <Pressable onPress={() => handleTabChange('all')}>
            <View
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.xl,
                backgroundColor: activeTab === 'all' ? colors.primary[500] : colors.gray[100],
                ...(activeTab === 'all' ? shadows.sm : {}),
              }}
            >
              <HStack space="xs" className="items-center">
                <Text
                  className={`font-semibold text-sm ${
                    activeTab === 'all' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {t('events.all')}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: activeTab === 'all' ? 'rgba(255,255,255,0.2)' : colors.gray[200],
                  }}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'all' ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {counts.total}
                  </Text>
                </View>
              </HStack>
            </View>
          </Pressable>

          {/* Upcoming Tab */}
          <Pressable onPress={() => handleTabChange('upcoming')}>
            <View
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.xl,
                backgroundColor: activeTab === 'upcoming' ? colors.primary[500] : colors.gray[100],
                ...(activeTab === 'upcoming' ? shadows.sm : {}),
              }}
            >
              <HStack space="xs" className="items-center">
                <Text
                  className={`font-semibold text-sm ${
                    activeTab === 'upcoming' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {t('events.upcoming')}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: activeTab === 'upcoming' ? 'rgba(255,255,255,0.2)' : colors.gray[200],
                  }}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'upcoming' ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {counts.upcoming}
                  </Text>
                </View>
              </HStack>
            </View>
          </Pressable>

          {/* RSVP'd Tab */}
          <Pressable onPress={() => handleTabChange('rsvp')}>
            <View
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.xl,
                backgroundColor: activeTab === 'rsvp' ? colors.primary[500] : colors.gray[100],
                ...(activeTab === 'rsvp' ? shadows.sm : {}),
              }}
            >
              <HStack space="xs" className="items-center">
                <Text
                  className={`font-semibold text-sm ${
                    activeTab === 'rsvp' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {t('events.myRSVPs')}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: activeTab === 'rsvp' ? 'rgba(255,255,255,0.2)' : colors.gray[200],
                  }}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'rsvp' ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {counts.rsvp}
                  </Text>
                </View>
              </HStack>
            </View>
          </Pressable>

          {/* Attended Tab */}
          <Pressable onPress={() => handleTabChange('attended')}>
            <View
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.xl,
                backgroundColor: activeTab === 'attended' ? colors.primary[500] : colors.gray[100],
                ...(activeTab === 'attended' ? shadows.sm : {}),
              }}
            >
              <HStack space="xs" className="items-center">
                <Text
                  className={`font-semibold text-sm ${
                    activeTab === 'attended' ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {t('events.attended')}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 10,
                    backgroundColor: activeTab === 'attended' ? 'rgba(255,255,255,0.2)' : colors.gray[200],
                  }}
                >
                  <Text
                    className={`text-xs font-bold ${
                      activeTab === 'attended' ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {counts.attended}
                  </Text>
                </View>
              </HStack>
            </View>
          </Pressable>
        </HStack>
      </ScrollView>

      {/* Results List */}
      <FlashList
        data={filteredEvents}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={120}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
      />
    </View>
  );
}
