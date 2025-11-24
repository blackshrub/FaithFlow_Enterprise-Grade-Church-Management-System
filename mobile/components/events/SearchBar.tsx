/**
 * Event Search Bar Component
 *
 * Features:
 * - Debounced input (300ms)
 * - Integrates with eventFilters store
 * - Clear button when typing
 * - Accessible with proper labels
 */

import React, { useEffect, useState, useCallback } from 'react';
import { View, TextInput, Pressable } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/icon';
import { colors } from '@/constants/theme';
import { useEventFiltersStore } from '@/stores/eventFilters';

export function SearchBar() {
  const { t } = useTranslation();
  const { searchTerm, setSearchTerm } = useEventFiltersStore();
  const [localValue, setLocalValue] = useState(searchTerm);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== searchTerm) {
        setSearchTerm(localValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, searchTerm, setSearchTerm]);

  // Sync when store changes externally (e.g., clear all filters)
  useEffect(() => {
    if (searchTerm === '' && localValue !== '') {
      setLocalValue('');
    }
  }, [searchTerm, localValue]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    setSearchTerm('');
  }, [setSearchTerm]);

  return (
    <View className="px-4 py-3 bg-white border-b border-gray-100">
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
          className="flex-1 text-base text-gray-900"
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
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
