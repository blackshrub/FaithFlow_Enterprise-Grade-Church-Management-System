/**
 * MessageSearch Component
 *
 * WhatsApp-style message search within chat.
 * Features:
 * - Search text in messages
 * - Navigate between results (up/down arrows)
 * - Highlight matched text
 * - Show match count
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Animated,
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
import { MotiView } from 'moti';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { colors, borderRadius } from '@/constants/theme';
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
    <MotiView
      from={{ opacity: 0, translateY: -10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 200 }}
      style={styles.container}
    >
      <HStack space="sm" className="items-center flex-1">
        {/* Back button */}
        <Pressable onPress={handleClose} style={styles.backButton}>
          <Icon as={ArrowLeft} size="md" style={{ color: '#FFFFFF' }} />
        </Pressable>

        {/* Search input */}
        <View style={styles.inputContainer}>
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
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} style={styles.clearButton}>
              <Icon as={X} size="sm" style={{ color: colors.gray[500] }} />
            </Pressable>
          )}
        </View>

        {/* Results count */}
        {query.length >= 2 && (
          <Text style={styles.resultCount}>
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
              style={styles.navButton}
              disabled={results.length === 0}
            >
              <Icon as={ChevronUp} size="md" style={{ color: '#FFFFFF' }} />
            </Pressable>
            <Pressable
              onPress={handleNext}
              style={styles.navButton}
              disabled={results.length === 0}
            >
              <Icon as={ChevronDown} size="md" style={{ color: '#FFFFFF' }} />
            </Pressable>
          </HStack>
        )}
      </HStack>
    </MotiView>
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
        style={[style, styles.highlightedText]}
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

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#075E54',
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[900],
    marginLeft: 8,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  resultCount: {
    fontSize: 14,
    color: '#FFFFFF',
    minWidth: 40,
    textAlign: 'center',
  },
  navButton: {
    padding: 8,
    opacity: 0.8,
  },
  highlightedText: {
    backgroundColor: '#FFE082',
    color: colors.gray[900],
    fontWeight: '600',
  },
});

export default MessageSearchHeader;
