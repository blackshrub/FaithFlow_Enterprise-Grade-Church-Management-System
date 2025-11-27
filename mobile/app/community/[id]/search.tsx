/**
 * Community Message Search Screen
 *
 * Search through community messages:
 * - Full-text search with debounce
 * - Search results with highlighted matches
 * - Navigate to message in context
 * - Search filters (date range, sender, type)
 * - Recent searches history
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ArrowLeft,
  Search,
  X,
  Clock,
  MessageCircle,
  Image as ImageIcon,
  File,
  BarChart3,
  ChevronRight,
  Trash2,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Badge, BadgeText } from '@/components/ui/badge';

import { useSearchMessages } from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import type { CommunityMessage } from '@/types/communities';

// =============================================================================
// CONSTANTS
// =============================================================================

const RECENT_SEARCHES_KEY = 'community_recent_searches';
const MAX_RECENT_SEARCHES = 10;
const SEARCH_DEBOUNCE_MS = 300;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));

  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <Text key={index} className="text-primary-600 font-bold bg-primary-50">
        {part}
      </Text>
    ) : (
      part
    )
  );
}

function getMessageIcon(messageType: string) {
  switch (messageType) {
    case 'image':
      return ImageIcon;
    case 'video':
      return ImageIcon;
    case 'document':
      return File;
    case 'poll':
      return BarChart3;
    default:
      return MessageCircle;
  }
}

// =============================================================================
// SEARCH RESULT ITEM
// =============================================================================

interface SearchResultItemProps {
  message: CommunityMessage;
  query: string;
  onPress: () => void;
}

function SearchResultItem({ message, query, onPress }: SearchResultItemProps) {
  const MessageIcon = getMessageIcon(message.message_type);

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="mx-4 mb-2 p-3 bg-white rounded-xl active:bg-gray-50"
      style={shadows.sm}
    >
      <HStack space="md">
        {/* Avatar */}
        <Avatar size="sm">
          {message.sender?.avatar_url ? (
            <AvatarImage source={{ uri: message.sender.avatar_url }} />
          ) : (
            <AvatarFallbackText>{message.sender?.name || '?'}</AvatarFallbackText>
          )}
        </Avatar>

        {/* Content */}
        <VStack className="flex-1">
          {/* Sender and time */}
          <HStack className="justify-between items-center mb-1">
            <Text className="text-gray-900 font-medium text-sm">
              {message.sender?.name || 'Unknown'}
            </Text>
            <Text className="text-gray-400 text-xs">
              {formatDate(message.created_at)}
            </Text>
          </HStack>

          {/* Message preview */}
          <HStack space="sm" className="items-center">
            {message.message_type !== 'text' && (
              <Icon as={MessageIcon} size="xs" className="text-gray-400" />
            )}
            <Text className="text-gray-600 text-sm flex-1" numberOfLines={2}>
              {message.text
                ? highlightMatch(message.text, query)
                : message.message_type === 'poll'
                ? '[Poll]'
                : `[${message.message_type}]`}
            </Text>
          </HStack>

          {/* Channel indicator */}
          {message.channel_type && message.channel_type !== 'general' && (
            <Badge size="sm" action="muted" variant="outline" className="mt-1 self-start">
              <BadgeText className="text-gray-500 capitalize">
                {message.channel_type === 'announcement' ? 'Announcement' : 'Sub-group'}
              </BadgeText>
            </Badge>
          )}
        </VStack>

        <Icon as={ChevronRight} size="sm" className="text-gray-400" />
      </HStack>
    </Pressable>
  );
}

// =============================================================================
// RECENT SEARCH ITEM
// =============================================================================

interface RecentSearchItemProps {
  query: string;
  onPress: () => void;
  onRemove: () => void;
}

function RecentSearchItem({ query, onPress, onRemove }: RecentSearchItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3 active:bg-gray-50"
    >
      <Icon as={Clock} size="sm" className="text-gray-400 mr-3" />
      <Text className="flex-1 text-gray-700">{query}</Text>
      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRemove();
        }}
        className="p-2 active:opacity-70"
      >
        <Icon as={X} size="xs" className="text-gray-400" />
      </Pressable>
    </Pressable>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function CommunitySearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: communityId } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuthStore();

  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [inputFocused, setInputFocused] = useState(true);

  // Load recent searches
  useEffect(() => {
    AsyncStorage.getItem(`${RECENT_SEARCHES_KEY}_${communityId}`)
      .then((data) => {
        if (data) {
          setRecentSearches(JSON.parse(data));
        }
      })
      .catch(console.error);
  }, [communityId]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  // Search query
  const shouldSearch = debouncedQuery.trim().length >= 2;
  const {
    data: searchResults,
    isLoading,
    isFetching,
  } = useSearchMessages(communityId, debouncedQuery, shouldSearch);

  const saveRecentSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    const updated = [
      searchQuery,
      ...recentSearches.filter((s) => s !== searchQuery),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updated);
    await AsyncStorage.setItem(
      `${RECENT_SEARCHES_KEY}_${communityId}`,
      JSON.stringify(updated)
    );
  }, [communityId, recentSearches]);

  const removeRecentSearch = useCallback(async (searchQuery: string) => {
    const updated = recentSearches.filter((s) => s !== searchQuery);
    setRecentSearches(updated);
    await AsyncStorage.setItem(
      `${RECENT_SEARCHES_KEY}_${communityId}`,
      JSON.stringify(updated)
    );
  }, [communityId, recentSearches]);

  const clearAllRecent = useCallback(async () => {
    setRecentSearches([]);
    await AsyncStorage.removeItem(`${RECENT_SEARCHES_KEY}_${communityId}`);
  }, [communityId]);

  const handleResultPress = useCallback((message: CommunityMessage) => {
    saveRecentSearch(query);
    // Navigate to the message in context (would scroll to message)
    router.push({
      pathname: `/community/${communityId}/chat` as any,
      params: { scrollToMessage: message.id },
    });
  }, [communityId, query, router, saveRecentSearch]);

  const handleRecentPress = useCallback((recentQuery: string) => {
    setQuery(recentQuery);
    setDebouncedQuery(recentQuery);
    inputRef.current?.blur();
  }, []);

  const handleClearQuery = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuery('');
    setDebouncedQuery('');
    inputRef.current?.focus();
  };

  const showResults = shouldSearch && searchResults;
  const showRecent = !shouldSearch && recentSearches.length > 0;
  const showEmpty = shouldSearch && !isLoading && (!searchResults || searchResults.length === 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header with Search Bar */}
      <View className="bg-white border-b border-gray-100" style={shadows.sm}>
        <HStack className="px-4 py-3 items-center" space="md">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="active:opacity-70"
          >
            <Icon as={ArrowLeft} size="lg" className="text-gray-800" />
          </Pressable>

          {/* Search Input */}
          <View className="flex-1 flex-row items-center bg-gray-100 rounded-xl px-3 py-2">
            <Icon as={Search} size="sm" className="text-gray-400 mr-2" />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search messages..."
              placeholderTextColor={colors.gray[400]}
              autoFocus
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              returnKeyType="search"
              onSubmitEditing={() => {
                if (query.trim()) {
                  saveRecentSearch(query);
                  Keyboard.dismiss();
                }
              }}
              className="flex-1 text-base"
              style={{ color: colors.gray[900] }}
            />
            {query.length > 0 && (
              <Pressable onPress={handleClearQuery} className="p-1 active:opacity-70">
                <Icon as={X} size="sm" className="text-gray-400" />
              </Pressable>
            )}
          </View>
        </HStack>
      </View>

      {/* Content */}
      <View className="flex-1">
        {/* Loading */}
        {isLoading && (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary[500]} />
            <Text className="text-gray-500 mt-4">Searching...</Text>
          </View>
        )}

        {/* Search Results */}
        {showResults && !isLoading && (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SearchResultItem
                message={item}
                query={debouncedQuery}
                onPress={() => handleResultPress(item)}
              />
            )}
            contentContainerStyle={{ paddingVertical: spacing.md }}
            ListHeaderComponent={
              <HStack className="px-4 mb-2 items-center justify-between">
                <Text className="text-gray-500 text-sm">
                  {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                </Text>
                {isFetching && (
                  <ActivityIndicator size="small" color={colors.primary[500]} />
                )}
              </HStack>
            }
          />
        )}

        {/* Recent Searches */}
        {showRecent && (
          <View className="flex-1">
            <HStack className="px-4 py-3 items-center justify-between">
              <Text className="text-gray-600 font-semibold">Recent Searches</Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  clearAllRecent();
                }}
                className="active:opacity-70"
              >
                <Text className="text-primary-600 text-sm">Clear all</Text>
              </Pressable>
            </HStack>

            <View className="bg-white mx-4 rounded-xl overflow-hidden" style={shadows.sm}>
              {recentSearches.map((recentQuery, index) => (
                <View key={recentQuery}>
                  <RecentSearchItem
                    query={recentQuery}
                    onPress={() => handleRecentPress(recentQuery)}
                    onRemove={() => removeRecentSearch(recentQuery)}
                  />
                  {index < recentSearches.length - 1 && (
                    <View className="h-px bg-gray-100 ml-12" />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {showEmpty && (
          <VStack className="flex-1 items-center justify-center px-8" space="md">
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.gray[100] }}
              >
                <Icon as={Search} size="2xl" className="text-gray-400" />
              </View>
            </MotiView>
            <Text className="text-gray-600 text-center text-lg font-medium">
              No results found
            </Text>
            <Text className="text-gray-500 text-center">
              Try searching with different keywords
            </Text>
          </VStack>
        )}

        {/* Initial State */}
        {!shouldSearch && recentSearches.length === 0 && (
          <VStack className="flex-1 items-center justify-center px-8" space="md">
            <MotiView
              from={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring' }}
            >
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.primary[50] }}
              >
                <Icon as={Search} size="2xl" style={{ color: colors.primary[400] }} />
              </View>
            </MotiView>
            <Text className="text-gray-600 text-center text-lg font-medium">
              Search Messages
            </Text>
            <Text className="text-gray-500 text-center">
              Find messages by text content, sender name, or keywords
            </Text>
          </VStack>
        )}
      </View>
    </SafeAreaView>
  );
}
