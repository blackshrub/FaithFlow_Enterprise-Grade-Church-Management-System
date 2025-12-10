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

import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRequireAuth } from '@/hooks/useRequireAuth';
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
  FormControlError,
  FormControlErrorText,
} from '@/components/ui/form-control';
import { Spinner } from '@/components/ui/spinner';

import { useAuthStore } from '@/stores/auth';
import { colors, borderRadius, spacing, shadows } from '@/constants/theme';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';
import { QUERY_KEYS } from '@/constants/api';
import { prayerApi, type PrayerSubmission } from '@/services/api/prayer';
import type { PrayerCategory } from '@/types/prayer';
import { getErrorMessage } from '@/utils/errorHelpers';
import type { LucideIcon } from 'lucide-react-native';

// UX FIX: Draft storage key for form recovery
const PRAYER_DRAFT_KEY = 'prayer_request_draft';

interface PrayerDraft {
  title: string;
  description: string;
  category: PrayerCategory;
  isAnonymous: boolean;
  savedAt: string;
}

export default function CreatePrayerRequestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { member } = useAuthStore();

  // SEC-M7: Route protection - redirect to login if not authenticated
  const { isLoading: authLoading } = useRequireAuth();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PrayerCategory>('other');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);

  // UX FIX: Inline validation error state (UX-M3)
  const [titleError, setTitleError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');

  // UX FIX: Load draft on mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draftStr = await AsyncStorage.getItem(PRAYER_DRAFT_KEY);
        if (draftStr) {
          const draft: PrayerDraft = JSON.parse(draftStr);
          // Only restore if draft is less than 24 hours old
          const savedAt = new Date(draft.savedAt).getTime();
          const now = Date.now();
          const hoursSinceSave = (now - savedAt) / (1000 * 60 * 60);
          if (hoursSinceSave < 24) {
            setTitle(draft.title || '');
            setDescription(draft.description || '');
            setCategory(draft.category || 'other');
            setIsAnonymous(draft.isAnonymous || false);
          } else {
            // Draft too old, clear it
            await AsyncStorage.removeItem(PRAYER_DRAFT_KEY);
          }
        }
      } catch (error) {
        console.warn('[Prayer] Failed to load draft:', error);
      } finally {
        setDraftLoaded(true);
      }
    };
    loadDraft();
  }, []);

  // UX FIX: Auto-save draft when form values change (debounced)
  useEffect(() => {
    if (!draftLoaded) return; // Don't save until we've loaded

    const saveDraft = async () => {
      // Only save if there's actual content
      if (!title.trim() && !description.trim()) {
        // Clear draft if form is empty
        await AsyncStorage.removeItem(PRAYER_DRAFT_KEY);
        return;
      }

      const draft: PrayerDraft = {
        title,
        description,
        category,
        isAnonymous,
        savedAt: new Date().toISOString(),
      };
      try {
        await AsyncStorage.setItem(PRAYER_DRAFT_KEY, JSON.stringify(draft));
      } catch (error) {
        console.warn('[Prayer] Failed to save draft:', error);
      }
    };

    // Debounce save to avoid excessive writes
    const timeout = setTimeout(saveDraft, 500);
    return () => clearTimeout(timeout);
  }, [title, description, category, isAnonymous, draftLoaded]);

  // Helper to clear draft
  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(PRAYER_DRAFT_KEY);
    } catch (error) {
      console.warn('[Prayer] Failed to clear draft:', error);
    }
  }, []);

  // Categories with icons and colors
  const categories: {
    value: PrayerCategory;
    label: string;
    icon: LucideIcon;
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

  // Create prayer mutation using Prayer Intelligence API
  const createMutation = useMutation({
    mutationFn: async (data: PrayerSubmission) => {
      return prayerApi.submitPrayer(data);
    },
    onSuccess: (response) => {
      // DATA-M2 FIX: Use church-scoped query key functions
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRAYER_REQUESTS(member?.church_id || '') });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_PRAYER_REQUESTS(member?.church_id || '') });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // UX FIX: Clear draft on successful submission
      clearDraft();

      // Navigate to resources screen with Prayer Intelligence analysis
      if (response.resources) {
        router.replace({
          pathname: '/prayer/resources',
          params: {
            prayerId: response.id,
            resources: JSON.stringify(response.resources),
          },
        });
      } else {
        // Fallback if no resources (Prayer Intelligence disabled)
        showSuccessToast(t('prayer.create.success'), t('prayer.create.successDesc'));
        router.back();
      }
    },
    onError: (error: unknown) => {
      console.error('Failed to create prayer request:', error);
      showErrorToast(
        t('prayer.create.error'),
        getErrorMessage(error, t('prayer.create.errorDesc'))
      );
    },
  });

  // UX FIX: Clear errors when user starts typing (UX-M3)
  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (titleError) setTitleError('');
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    if (descriptionError) setDescriptionError('');
  };

  // Handle submit with inline validation (UX-M3)
  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Reset errors
    setTitleError('');
    setDescriptionError('');

    let hasErrors = false;

    // Validation with inline error display
    if (!title.trim()) {
      setTitleError(t('prayer.create.titleRequired'));
      hasErrors = true;
    } else if (title.length < 5) {
      setTitleError(t('prayer.create.titleTooShort'));
      hasErrors = true;
    }

    if (!description.trim()) {
      setDescriptionError(t('prayer.create.descriptionRequired'));
      hasErrors = true;
    } else if (description.length < 10) {
      setDescriptionError(t('prayer.create.descriptionTooShort'));
      hasErrors = true;
    }

    if (hasErrors) {
      showErrorToast(t('prayer.create.error'), t('prayer.create.fixErrors', 'Please fix the errors above'));
      return;
    }

    // Combine title and description for Prayer Intelligence analysis
    const requestText = `${title.trim()}\n\n${description.trim()}`;

    createMutation.mutate({
      request_text: requestText,
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

              {/* Title - UX-M3: Inline validation */}
              <FormControl isInvalid={!!titleError}>
                <FormControlLabel>
                  <FormControlLabelText>{t('prayer.create.requestTitle')}</FormControlLabelText>
                </FormControlLabel>
                <Input className={titleError ? 'border-red-500' : ''}>
                  <InputField
                    value={title}
                    onChangeText={handleTitleChange}
                    placeholder={t('prayer.create.titlePlaceholder')}
                    maxLength={100}
                    accessibilityLabel={t('prayer.create.requestTitle')}
                  />
                </Input>
                {titleError ? (
                  <FormControlError>
                    <FormControlErrorText className="text-red-500">
                      {titleError}
                    </FormControlErrorText>
                  </FormControlError>
                ) : (
                  <FormControlHelper>
                    <FormControlHelperText>
                      {title.length}/100 {t('prayer.create.characters')}
                    </FormControlHelperText>
                  </FormControlHelper>
                )}
              </FormControl>

              {/* Description - UX-M3: Inline validation */}
              <FormControl isInvalid={!!descriptionError}>
                <FormControlLabel>
                  <FormControlLabelText>
                    {t('prayer.create.requestDescription')}
                  </FormControlLabelText>
                </FormControlLabel>
                <Textarea size="lg" className={descriptionError ? 'border-red-500' : ''}>
                  <TextareaInput
                    value={description}
                    onChangeText={handleDescriptionChange}
                    placeholder={t('prayer.create.descriptionPlaceholder')}
                    style={{ minHeight: 120 }}
                    maxLength={1000}
                    accessibilityLabel={t('prayer.create.requestDescription')}
                  />
                </Textarea>
                {descriptionError ? (
                  <FormControlError>
                    <FormControlErrorText className="text-red-500">
                      {descriptionError}
                    </FormControlErrorText>
                  </FormControlError>
                ) : (
                  <FormControlHelper>
                    <FormControlHelperText>
                      {description.length}/1000 {t('prayer.create.characters')}
                    </FormControlHelperText>
                  </FormControlHelper>
                )}
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
