/**
 * Search Empty State Component
 *
 * Displayed when no search results are found
 * Includes animation and helpful message
 */

import React from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import { SearchX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { colors } from '@/constants/theme';

interface SearchEmptyStateProps {
  searchTerm: string;
}

export function SearchEmptyState({ searchTerm }: SearchEmptyStateProps) {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center px-8 bg-gray-50">
      <MotiView
        from={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: 'spring',
          damping: 15,
          stiffness: 150,
        }}
      >
        <VStack space="lg" className="items-center max-w-sm">
          {/* Icon */}
          <View
            className="w-24 h-24 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.gray[100] }}
          >
            <Icon as={SearchX} size="2xl" className="text-gray-400" />
          </View>

          {/* Message */}
          <VStack space="sm" className="items-center">
            <Heading size="xl" className="text-gray-900 text-center font-bold">
              {t('events.search.noResults')}
            </Heading>
            <Text className="text-gray-500 text-center text-base">
              {t('events.search.noResultsDesc', { term: searchTerm })}
            </Text>
          </VStack>

          {/* Suggestions */}
          <VStack space="xs" className="w-full">
            <Text className="text-sm font-semibold text-gray-700">
              {t('events.search.suggestions')}
            </Text>
            <VStack space="xs">
              <Text className="text-sm text-gray-600">
                • {t('events.search.suggestionSpelling')}
              </Text>
              <Text className="text-sm text-gray-600">
                • {t('events.search.suggestionKeywords')}
              </Text>
              <Text className="text-sm text-gray-600">
                • {t('events.search.suggestionFilter')}
              </Text>
            </VStack>
          </VStack>
        </VStack>
      </MotiView>
    </View>
  );
}
