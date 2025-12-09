/**
 * Event Search Bar Component
 *
 * Features:
 * - Debounced input (300ms)
 * - Integrates with eventFilters store
 * - Clear button when typing
 * - Accessible with proper labels
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/icon';
import { colors } from '@/constants/theme';
import { useSearchTerm, useEventFilterActions } from '@/stores/eventFilters';

export function SearchBar() {
  const { t } = useTranslation();
  // Granular selectors for performance - prevents re-render on unrelated filter changes
  const searchTerm = useSearchTerm();
  const { setSearchTerm } = useEventFilterActions();
  const [localValue, setLocalValue] = useState(searchTerm);
  const isTypingRef = useRef(false);

  // Debounce search input (300ms)
  useEffect(() => {
    isTypingRef.current = true;
    const timer = setTimeout(() => {
      if (localValue !== searchTerm) {
        setSearchTerm(localValue);
      }
      isTypingRef.current = false;
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, searchTerm, setSearchTerm]);

  // Sync when store changes externally (e.g., clear all filters)
  // Only sync if we're not currently typing
  useEffect(() => {
    if (!isTypingRef.current && searchTerm !== localValue) {
      setLocalValue(searchTerm);
    }
  }, [searchTerm]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    setSearchTerm('');
  }, [setSearchTerm]);

  return (
    <View className="mb-4">
      <View
        className="flex-row items-center px-4 py-3 rounded-xl bg-gray-50"
        style={{ borderWidth: 1, borderColor: colors.gray[200] }}
      >
        {/* Search Icon */}
        <Icon as={Search} size="lg" className="text-gray-400 mr-3" />

        {/* Text Input */}
        <TextInput
          value={localValue}
          onChangeText={setLocalValue}
          placeholder={t('events.searchPlaceholder')}
          placeholderTextColor={colors.gray[400]}
          style={{
            flex: 1,
            fontSize: 16,
            color: colors.gray[900],
            padding: 0,
            margin: 0,
          }}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          editable={true}
          selectTextOnFocus={false}
        />

        {/* Clear Button */}
        {localValue.length > 0 && (
          <Pressable
            onPress={handleClear}
            className="active:opacity-50 ml-2"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View
              className="w-6 h-6 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.gray[300] }}
            >
              <Icon as={X} size="xs" className="text-gray-600" />
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}
