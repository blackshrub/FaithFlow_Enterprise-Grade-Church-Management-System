/**
 * Create Prayer Request Screen
 *
 * Features:
 * - Create new prayer request
 * - Category selection
 * - Anonymous option
 * - Form validation
 * - Toast notifications
 * - Complete bilingual support
 */

import React, { useState } from 'react';
import { ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  MessageCircle,
  Heart,
  DollarSign,
  Sparkles,
  Briefcase,
  Users,
  Compass,
  Gift,
  Folder,
} from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
  FormControlHelper,
  FormControlHelperText,
} from '@/components/ui/form-control';
import { Spinner } from '@/components/ui/spinner';

import { useAuthStore } from '@/stores/auth';
import { colors, borderRadius, spacing, shadows } from '@/constants/theme';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';
import { api } from '@/services/api';
import { QUERY_KEYS } from '@/constants/api';
import type { PrayerCategory, CreatePrayerRequest } from '@/types/prayer';

export default function CreatePrayerRequestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { member } = useAuthStore();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PrayerCategory>('other');
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Categories with icons and colors
  const categories: {
    value: PrayerCategory;
    label: string;
    icon: any;
    color: string;
    bgColor: string;
  }[] = [
    {
      value: 'health',
      label: t('prayer.category.health'),
      icon: Heart,
      color: colors.error[500],
      bgColor: colors.error[50],
    },
    {
      value: 'family',
      label: t('prayer.category.family'),
      icon: Users,
      color: colors.secondary[500],
      bgColor: colors.secondary[50],
    },
    {
      value: 'financial',
      label: t('prayer.category.financial'),
      icon: DollarSign,
      color: colors.success[500],
      bgColor: colors.success[50],
    },
    {
      value: 'spiritual',
      label: t('prayer.category.spiritual'),
      icon: Sparkles,
      color: colors.primary[500],
      bgColor: colors.primary[50],
    },
    {
      value: 'work',
      label: t('prayer.category.work'),
      icon: Briefcase,
      color: colors.warning[600],
      bgColor: colors.warning[50],
    },
    {
      value: 'relationships',
      label: t('prayer.category.relationships'),
      icon: Heart,
      color: colors.pink[500],
      bgColor: colors.pink[50],
    },
    {
      value: 'guidance',
      label: t('prayer.category.guidance'),
      icon: Compass,
      color: colors.blue[500],
      bgColor: colors.blue[50],
    },
    {
      value: 'thanksgiving',
      label: t('prayer.category.thanksgiving'),
      icon: Gift,
      color: colors.amber[600],
      bgColor: colors.amber[50],
    },
    {
      value: 'other',
      label: t('prayer.category.other'),
      icon: Folder,
      color: colors.gray[500],
      bgColor: colors.gray[50],
    },
  ];

  // Create prayer mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePrayerRequest) => {
      const response = await api.post('/api/prayer-requests', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccessToast(t('prayer.create.success'), t('prayer.create.successDesc'));
      router.back();
    },
    onError: (error: any) => {
      console.error('Failed to create prayer request:', error);
      showErrorToast(
        t('prayer.create.error'),
        error.response?.data?.detail || t('prayer.create.errorDesc')
      );
    },
  });

  // Handle submit
  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Validation
    if (!title.trim()) {
      showErrorToast(t('prayer.create.error'), t('prayer.create.titleRequired'));
      return;
    }

    if (!description.trim()) {
      showErrorToast(t('prayer.create.error'), t('prayer.create.descriptionRequired'));
      return;
    }

    if (title.length < 5) {
      showErrorToast(t('prayer.create.error'), t('prayer.create.titleTooShort'));
      return;
    }

    if (description.length < 10) {
      showErrorToast(t('prayer.create.error'), t('prayer.create.descriptionTooShort'));
      return;
    }

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      is_anonymous: isAnonymous,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-200">
        <HStack space="md" className="items-center">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                backgroundColor: colors.gray[100],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Icon as={ChevronLeft} size="lg" className="text-gray-700" />
            </View>
          </Pressable>
          <VStack className="flex-1">
            <Heading size="lg" className="text-gray-900">
              {t('prayer.create.title')}
            </Heading>
            <Text className="text-gray-600" size="sm">
              {t('prayer.create.subtitle')}
            </Text>
          </VStack>
        </HStack>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <VStack space="lg" className="px-6 py-6">
          {/* Basic Information */}
          <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
            <VStack space="md" className="p-5">
              <HStack space="sm" className="items-center mb-2">
                <Icon as={MessageCircle} size="md" className="text-primary-500" />
                <Heading size="md" className="text-gray-900">
                  {t('prayer.create.requestDetails')}
                </Heading>
              </HStack>

              {/* Title */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('prayer.create.requestTitle')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t('prayer.create.titlePlaceholder')}
                    maxLength={100}
                  />
                </Input>
                <FormControlHelper>
                  <FormControlHelperText>
                    {title.length}/100 {t('prayer.create.characters')}
                  </FormControlHelperText>
                </FormControlHelper>
              </FormControl>

              {/* Description */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>
                    {t('prayer.create.requestDescription')}
                  </FormControlLabelText>
                </FormControlLabel>
                <Textarea size="lg">
                  <TextareaInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t('prayer.create.descriptionPlaceholder')}
                    style={{ minHeight: 120 }}
                    maxLength={1000}
                  />
                </Textarea>
                <FormControlHelper>
                  <FormControlHelperText>
                    {description.length}/1000 {t('prayer.create.characters')}
                  </FormControlHelperText>
                </FormControlHelper>
              </FormControl>

              {/* Anonymous Toggle */}
              <FormControl>
                <HStack
                  space="md"
                  className="items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: colors.gray[50] }}
                >
                  <VStack className="flex-1">
                    <Text className="text-gray-900 font-semibold" size="md">
                      {t('prayer.create.anonymous')}
                    </Text>
                    <Text className="text-gray-600" size="sm">
                      {t('prayer.create.anonymousDesc')}
                    </Text>
                  </VStack>
                  <Switch
                    value={isAnonymous}
                    onValueChange={(value) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsAnonymous(value);
                    }}
                    trackColor={{ false: colors.gray[300], true: colors.primary[500] }}
                    thumbColor="#ffffff"
                  />
                </HStack>
              </FormControl>
            </VStack>
          </Card>

          {/* Category Selection */}
          <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
            <VStack space="md" className="p-5">
              <Heading size="md" className="text-gray-900 mb-2">
                {t('prayer.create.selectCategory')}
              </Heading>

              <View className="flex-row flex-wrap gap-2">
                {categories.map((cat) => {
                  const isSelected = category === cat.value;
                  return (
                    <Pressable
                      key={cat.value}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCategory(cat.value);
                      }}
                      className="active:opacity-80"
                      style={{ width: '48%' }}
                    >
                      <Card
                        style={{
                          borderRadius: borderRadius.md,
                          backgroundColor: isSelected ? cat.bgColor : '#ffffff',
                          borderWidth: 2,
                          borderColor: isSelected ? cat.color : colors.gray[200],
                        }}
                      >
                        <HStack space="sm" className="items-center p-3">
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 999,
                              backgroundColor: isSelected ? cat.color : cat.bgColor,
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Icon
                              as={cat.icon}
                              size="sm"
                              style={{ color: isSelected ? '#ffffff' : cat.color }}
                            />
                          </View>
                          <Text
                            size="sm"
                            className="flex-1"
                            style={{
                              color: isSelected ? cat.color : colors.gray[700],
                              fontWeight: isSelected ? '600' : '400',
                            }}
                          >
                            {cat.label}
                          </Text>
                        </HStack>
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            </VStack>
          </Card>
        </VStack>

        {/* Submit Button */}
        <View className="px-6 pb-6">
          <Button
            size="lg"
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            style={{
              backgroundColor: colors.primary[500],
              borderRadius: borderRadius.lg,
            }}
          >
            {createMutation.isPending ? (
              <HStack space="sm" className="items-center">
                <Spinner size="small" color="#ffffff" />
                <ButtonText>{t('prayer.create.submitting')}</ButtonText>
              </HStack>
            ) : (
              <ButtonText>{t('prayer.create.submit')}</ButtonText>
            )}
          </Button>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
