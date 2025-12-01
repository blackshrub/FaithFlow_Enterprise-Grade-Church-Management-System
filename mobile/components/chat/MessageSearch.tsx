/**
 * MessageSearch Component
 *
 * WhatsApp-style message search within chat.
 * Features:
 * - Search text in messages
 * - Navigate between results (up/down arrows)
 * - Highlight matched text
 * - Show match count
 *
 * Styling: NativeWind-first with inline style for dynamic colors
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Keyboard,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ArrowLeft,
} from 'lucide-react-native';
import Animated, { SlideInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { colors } from '@/constants/theme';
import type { CommunityMessage } from '@/types/communities';

// =============================================================================
// TYPES
// =============================================================================

interface MessageSearchProps {
  messages: CommunityMessage[];
  onClose: () => void;
  onNavigateToMessage: (messageId: string) => void;
}

interface SearchResult {
  messageId: string;
  messageIndex: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

// =============================================================================
// SEARCH HEADER COMPONENT
// =============================================================================

export function MessageSearchHeader({
  messages,
  onClose,
  onNavigateToMessage,
}: MessageSearchProps) {
  const [query, setQuery] = useState('');
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);

  // Search results
  const results = useMemo<SearchResult[]>(() => {
    if (!query || query.length < 2) return [];

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    messages.forEach((message, index) => {
      if (!message.text) return;

      const lowerText = message.text.toLowerCase();
      let matchIndex = lowerText.indexOf(lowerQuery);

      while (matchIndex !== -1) {
        searchResults.push({
          messageId: message.id,
          messageIndex: index,
          text: message.text,
          matchStart: matchIndex,
          matchEnd: matchIndex + query.length,
        });
        matchIndex = lowerText.indexOf(lowerQuery, matchIndex + 1);
      }
    });

    return searchResults;
  }, [query, messages]);

  // Navigate to current result
  useEffect(() => {
    if (results.length > 0 && currentResultIndex < results.length) {
      const result = results[currentResultIndex];
      onNavigateToMessage(result.messageId);
    }
  }, [currentResultIndex, results, onNavigateToMessage]);

  const handlePrevious = useCallback(() => {
    if (results.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentResultIndex((prev) =>
      prev === 0 ? results.length - 1 : prev - 1
    );
  }, [results.length]);

  const handleNext = useCallback(() => {
    if (results.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentResultIndex((prev) =>
      prev === results.length - 1 ? 0 : prev + 1
    );
  }, [results.length]);

  const handleClear = useCallback(() => {
    setQuery('');
    setCurrentResultIndex(0);
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, []);

  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      className="px-2 py-2.5"
      style={{ backgroundColor: '#075E54' }}
    >
      <HStack space="sm" className="items-center flex-1">
        {/* Back button */}
        <Pressable onPress={handleClose} className="p-2">
          <Icon as={ArrowLeft} size="md" style={{ color: '#FFFFFF' }} />
        </Pressable>

        {/* Search input */}
        <View className="flex-1 flex-row items-center bg-white rounded-lg px-3 py-2">
          <Icon as={Search} size="sm" style={{ color: colors.gray[400] }} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setCurrentResultIndex(0);
            }}
            placeholder="Search..."
            placeholderTextColor={colors.gray[400]}
            className="flex-1 text-base ml-2 py-0"
            style={{ color: colors.gray[900] }}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} className="p-1">
              <Icon as={X} size="sm" style={{ color: colors.gray[500] }} />
            </Pressable>
          )}
        </View>

        {/* Results count */}
        {query.length >= 2 && (
          <Text className="text-sm min-w-[40px] text-center" style={{ color: '#FFFFFF' }}>
            {results.length > 0
              ? `${currentResultIndex + 1}/${results.length}`
              : '0'}
          </Text>
        )}

        {/* Navigation buttons */}
        {results.length > 0 && (
          <HStack space="xs">
            <Pressable
              onPress={handlePrevious}
              className="p-2 opacity-80"
              disabled={results.length === 0}
            >
              <Icon as={ChevronUp} size="md" style={{ color: '#FFFFFF' }} />
            </Pressable>
            <Pressable
              onPress={handleNext}
              className="p-2 opacity-80"
              disabled={results.length === 0}
            >
              <Icon as={ChevronDown} size="md" style={{ color: '#FFFFFF' }} />
            </Pressable>
          </HStack>
        )}
      </HStack>
    </Animated.View>
  );
}

// =============================================================================
// HIGHLIGHTED TEXT COMPONENT
// =============================================================================

interface HighlightedTextProps {
  text: string;
  highlight: string;
  style?: any;
}

export function HighlightedText({ text, highlight, style }: HighlightedTextProps) {
  if (!highlight || highlight.length < 2) {
    return <Text style={style}>{text}</Text>;
  }

  const parts: React.ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerHighlight = highlight.toLowerCase();
  let lastIndex = 0;
  let key = 0;

  let matchIndex = lowerText.indexOf(lowerHighlight);
  while (matchIndex !== -1) {
    // Add text before match
    if (matchIndex > lastIndex) {
      parts.push(
        <Text key={key++} style={style}>
          {text.slice(lastIndex, matchIndex)}
        </Text>
      );
    }

    // Add highlighted match
    parts.push(
      <Text
        key={key++}
        className="font-semibold"
        style={[style, { backgroundColor: '#FFE082', color: colors.gray[900] }]}
      >
        {text.slice(matchIndex, matchIndex + highlight.length)}
      </Text>
    );

    lastIndex = matchIndex + highlight.length;
    matchIndex = lowerText.indexOf(lowerHighlight, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <Text key={key++} style={style}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return <Text style={style}>{parts}</Text>;
}

// =============================================================================
// SEARCH CONTEXT
// =============================================================================

interface SearchContextType {
  query: string;
  isSearching: boolean;
  currentResultIndex: number;
  results: SearchResult[];
}

export const SearchContext = React.createContext<SearchContextType>({
  query: '',
  isSearching: false,
  currentResultIndex: 0,
  results: [],
});

// =============================================================================
// SEARCH PROVIDER HOOK
// =============================================================================

export function useMessageSearch(messages: CommunityMessage[]) {
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  const results = useMemo<SearchResult[]>(() => {
    if (!query || query.length < 2) return [];

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    messages.forEach((message, index) => {
      if (!message.text) return;

      const lowerText = message.text.toLowerCase();
      if (lowerText.includes(lowerQuery)) {
        searchResults.push({
          messageId: message.id,
          messageIndex: index,
          text: message.text,
          matchStart: 0,
          matchEnd: 0,
        });
      }
    });

    return searchResults;
  }, [query, messages]);

  const openSearch = useCallback(() => {
    setIsSearching(true);
    setQuery('');
    setCurrentResultIndex(0);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearching(false);
    setQuery('');
    setCurrentResultIndex(0);
  }, []);

  const setSearchQuery = useCallback((q: string) => {
    setQuery(q);
    setCurrentResultIndex(0);
  }, []);

  const nextResult = useCallback(() => {
    if (results.length === 0) return;
    setCurrentResultIndex((prev) =>
      prev === results.length - 1 ? 0 : prev + 1
    );
  }, [results.length]);

  const prevResult = useCallback(() => {
    if (results.length === 0) return;
    setCurrentResultIndex((prev) =>
      prev === 0 ? results.length - 1 : prev - 1
    );
  }, [results.length]);

  const currentResult = results[currentResultIndex] || null;

  return {
    isSearching,
    query,
    results,
    currentResultIndex,
    currentResult,
    openSearch,
    closeSearch,
    setSearchQuery,
    nextResult,
    prevResult,
  };
}

export default MessageSearchHeader;
