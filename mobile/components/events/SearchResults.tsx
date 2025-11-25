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
    passed: FilteredEvent[];
  };
  counts: {
    attended: number;
    rsvp: number;
    upcoming: number;
    passed: number;
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
          ...groupedResults.passed,
        ];
    }
  };

  const filteredEvents = getFilteredEvents();

  // Empty state component
  const EmptyTabState = () => {
    let message = '';

    switch (activeTab) {
      case 'upcoming':
        message = t('events.noUpcomingInSearch');
        break;
      case 'rsvp':
        message = t('events.noRSVPsInSearch');
        break;
      case 'attended':
        message = t('events.noAttendedInSearch');
        break;
      case 'all':
      default:
        message = t('events.noResultsInSearch');
        break;
    }

    return (
      <View className="flex-1 items-center px-8" style={{ paddingTop: 80 }}>
        <MotiView
          from={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 200 }}
          className="items-center"
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: colors.gray[100],
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <Icon as={Calendar} size="xl" className="text-gray-400" />
          </View>
          <Text className="text-gray-900 font-bold text-lg text-center mb-2">
            {t('events.noResults')}
          </Text>
          <Text className="text-gray-500 text-sm text-center">
            {message}
          </Text>
        </MotiView>
      </View>
    );
  };

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
      <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
        <HStack space="xs">
          {/* All Tab */}
          <Pressable onPress={() => handleTabChange('all')} style={{ flex: 1 }}>
            <View
              style={{
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: borderRadius.xl,
                backgroundColor: activeTab === 'all' ? colors.primary[500] : colors.gray[100],
                alignItems: 'center',
                justifyContent: 'center',
                ...(activeTab === 'all' ? shadows.sm : {}),
              }}
            >
              <Text
                className={`font-bold text-xs ${
                  activeTab === 'all' ? 'text-white' : 'text-gray-600'
                }`}
                numberOfLines={1}
              >
                {t('events.all')}
              </Text>
              <Text
                className={`text-xs font-bold mt-0.5 ${
                  activeTab === 'all' ? 'text-white' : 'text-gray-500'
                }`}
              >
                {counts.total}
              </Text>
            </View>
          </Pressable>

          {/* Upcoming Tab */}
          <Pressable onPress={() => handleTabChange('upcoming')} style={{ flex: 1 }}>
            <View
              style={{
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: borderRadius.xl,
                backgroundColor: activeTab === 'upcoming' ? colors.primary[500] : colors.gray[100],
                alignItems: 'center',
                justifyContent: 'center',
                ...(activeTab === 'upcoming' ? shadows.sm : {}),
              }}
            >
              <Text
                className={`font-bold text-xs ${
                  activeTab === 'upcoming' ? 'text-white' : 'text-gray-600'
                }`}
                numberOfLines={1}
              >
                {t('events.upcoming')}
              </Text>
              <Text
                className={`text-xs font-bold mt-0.5 ${
                  activeTab === 'upcoming' ? 'text-white' : 'text-gray-500'
                }`}
              >
                {counts.upcoming}
              </Text>
            </View>
          </Pressable>

          {/* RSVP'd Tab */}
          <Pressable onPress={() => handleTabChange('rsvp')} style={{ flex: 1 }}>
            <View
              style={{
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: borderRadius.xl,
                backgroundColor: activeTab === 'rsvp' ? colors.primary[500] : colors.gray[100],
                alignItems: 'center',
                justifyContent: 'center',
                ...(activeTab === 'rsvp' ? shadows.sm : {}),
              }}
            >
              <Text
                className={`font-bold text-xs ${
                  activeTab === 'rsvp' ? 'text-white' : 'text-gray-600'
                }`}
                numberOfLines={1}
              >
                {t('events.myRSVPs')}
              </Text>
              <Text
                className={`text-xs font-bold mt-0.5 ${
                  activeTab === 'rsvp' ? 'text-white' : 'text-gray-500'
                }`}
              >
                {counts.rsvp}
              </Text>
            </View>
          </Pressable>

          {/* Attended Tab */}
          <Pressable onPress={() => handleTabChange('attended')} style={{ flex: 1 }}>
            <View
              style={{
                paddingVertical: 10,
                paddingHorizontal: 8,
                borderRadius: borderRadius.xl,
                backgroundColor: activeTab === 'attended' ? colors.primary[500] : colors.gray[100],
                alignItems: 'center',
                justifyContent: 'center',
                ...(activeTab === 'attended' ? shadows.sm : {}),
              }}
            >
              <Text
                className={`font-bold text-xs ${
                  activeTab === 'attended' ? 'text-white' : 'text-gray-600'
                }`}
                numberOfLines={1}
              >
                {t('events.attended')}
              </Text>
              <Text
                className={`text-xs font-bold mt-0.5 ${
                  activeTab === 'attended' ? 'text-white' : 'text-gray-500'
                }`}
              >
                {counts.attended}
              </Text>
            </View>
          </Pressable>
        </HStack>
      </View>

      {/* Results List */}
      {filteredEvents.length > 0 ? (
        <FlashList
          data={filteredEvents}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          estimatedItemSize={120}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
        />
      ) : (
        <EmptyTabState />
      )}
    </View>
  );
}
