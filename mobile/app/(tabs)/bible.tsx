/**
 * Bible Reader Screen
 *
 * Features:
 * - Bible version selector
 * - Book/Chapter navigation
 * - FlashList for smooth scrolling
 * - Bookmarks and highlights
 * - Reading history
 */

import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { Card } from '@/components/ui/card';

export default function BibleScreen() {
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="px-6 pt-6 pb-4">
        <Heading size="2xl" className="text-gray-900">
          {t('bible.title')}
        </Heading>
        <Text className="text-gray-600 mt-1" size="md">
          {t('bible.subtitle')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-6">
        <Card className="p-6 mb-4">
          <VStack space="md">
            <Heading size="lg">Coming Soon</Heading>
            <Text className="text-gray-600">
              Bible reader with FlashList, bookmarks, and highlights will be
              implemented here.
            </Text>
          </VStack>
        </Card>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
