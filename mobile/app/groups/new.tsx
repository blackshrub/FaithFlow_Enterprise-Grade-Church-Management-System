/**
 * Create Group Screen
 *
 * Features:
 * - Create new group
 * - Category selection
 * - Meeting schedule and location
 * - Max members setting
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
  Users,
  BookOpen,
  Heart,
  Activity,
  Calendar,
  MapPin,
  Hash,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
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

type BackendGroupCategory = 'cell_group' | 'ministry_team' | 'activity' | 'support_group';

interface CreateGroupRequest {
  name: string;
  description: string;
  category: BackendGroupCategory;
  meeting_schedule?: string;
  location?: string;
  max_members?: number;
  is_open_for_join: boolean;
}

export default function CreateGroupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { member } = useAuthStore();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<BackendGroupCategory>('cell_group');
  const [meetingSchedule, setMeetingSchedule] = useState('');
  const [location, setLocation] = useState('');
  const [maxMembers, setMaxMembers] = useState('');
  const [isOpenForJoin, setIsOpenForJoin] = useState(true);

  // Categories with icons and colors (backend categories)
  const categories: {
    value: BackendGroupCategory;
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
  }[] = [
    {
      value: 'cell_group',
      label: t('groups.category.cellGroup'),
      icon: Users,
      color: colors.primary[500],
      bgColor: colors.primary[50],
    },
    {
      value: 'ministry_team',
      label: t('groups.category.ministryTeam'),
      icon: Heart,
      color: colors.secondary[500],
      bgColor: colors.secondary[50],
    },
    {
      value: 'activity',
      label: t('groups.category.activity'),
      icon: Activity,
      color: colors.success[500],
      bgColor: colors.success[50],
    },
    {
      value: 'support_group',
      label: t('groups.category.supportGroup'),
      icon: BookOpen,
      color: colors.warning[600],
      bgColor: colors.warning[50],
    },
  ];

  // Create group mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateGroupRequest) => {
      const response = await api.post('/api/v1/groups', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.GROUPS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_GROUPS });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccessToast(t('groups.create.success'), t('groups.create.successDesc'));
      router.back();
    },
    onError: (error: any) => {
      console.error('Failed to create group:', error);
      showErrorToast(
        t('groups.create.error'),
        error.response?.data?.detail || t('groups.create.errorDesc')
      );
    },
  });

  // Handle submit
  const handleSubmit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Validation
    if (!name.trim()) {
      showErrorToast(t('groups.create.error'), t('groups.create.nameRequired'));
      return;
    }

    if (!description.trim()) {
      showErrorToast(t('groups.create.error'), t('groups.create.descriptionRequired'));
      return;
    }

    if (name.length < 3) {
      showErrorToast(t('groups.create.error'), t('groups.create.nameTooShort'));
      return;
    }

    if (description.length < 10) {
      showErrorToast(t('groups.create.error'), t('groups.create.descriptionTooShort'));
      return;
    }

    // Validate max members if provided
    let parsedMaxMembers: number | undefined;
    if (maxMembers.trim()) {
      parsedMaxMembers = parseInt(maxMembers, 10);
      if (isNaN(parsedMaxMembers) || parsedMaxMembers < 1) {
        showErrorToast(t('groups.create.error'), t('groups.create.invalidMaxMembers'));
        return;
      }
    }

    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      category,
      meeting_schedule: meetingSchedule.trim() || undefined,
      location: location.trim() || undefined,
      max_members: parsedMaxMembers,
      is_open_for_join: isOpenForJoin,
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
              {t('groups.create.title')}
            </Heading>
            <Text className="text-gray-600" size="sm">
              {t('groups.create.subtitle')}
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
                <Icon as={Users} size="md" className="text-primary-500" />
                <Heading size="md" className="text-gray-900">
                  {t('groups.create.basicInfo')}
                </Heading>
              </HStack>

              {/* Name */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('groups.create.groupName')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={name}
                    onChangeText={setName}
                    placeholder={t('groups.create.namePlaceholder')}
                    maxLength={200}
                  />
                </Input>
                <FormControlHelper>
                  <FormControlHelperText>
                    {name.length}/200 {t('groups.create.characters')}
                  </FormControlHelperText>
                </FormControlHelper>
              </FormControl>

              {/* Description */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('groups.create.groupDescription')}</FormControlLabelText>
                </FormControlLabel>
                <Textarea size="lg">
                  <TextareaInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t('groups.create.descriptionPlaceholder')}
                    style={{ minHeight: 120 }}
                    maxLength={1000}
                  />
                </Textarea>
                <FormControlHelper>
                  <FormControlHelperText>
                    {description.length}/1000 {t('groups.create.characters')}
                  </FormControlHelperText>
                </FormControlHelper>
              </FormControl>

              {/* Category Selection */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('groups.create.selectCategory')}</FormControlLabelText>
                </FormControlLabel>
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
                                width: 32,
                                height: 32,
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
              </FormControl>
            </VStack>
          </Card>

          {/* Meeting Details */}
          <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
            <VStack space="md" className="p-5">
              <HStack space="sm" className="items-center mb-2">
                <Icon as={Calendar} size="md" className="text-primary-500" />
                <Heading size="md" className="text-gray-900">
                  {t('groups.create.meetingDetails')}
                </Heading>
              </HStack>

              {/* Meeting Schedule */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('groups.create.meetingSchedule')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={meetingSchedule}
                    onChangeText={setMeetingSchedule}
                    placeholder={t('groups.create.schedulePlaceholder')}
                    maxLength={200}
                  />
                </Input>
                <FormControlHelper>
                  <FormControlHelperText>
                    {t('groups.create.scheduleExample')}
                  </FormControlHelperText>
                </FormControlHelper>
              </FormControl>

              {/* Location */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('groups.create.location')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={location}
                    onChangeText={setLocation}
                    placeholder={t('groups.create.locationPlaceholder')}
                    maxLength={200}
                  />
                </Input>
              </FormControl>
            </VStack>
          </Card>

          {/* Group Settings */}
          <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
            <VStack space="md" className="p-5">
              <HStack space="sm" className="items-center mb-2">
                <Icon as={Hash} size="md" className="text-primary-500" />
                <Heading size="md" className="text-gray-900">
                  {t('groups.create.settings')}
                </Heading>
              </HStack>

              {/* Max Members */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('groups.create.maxMembers')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={maxMembers}
                    onChangeText={setMaxMembers}
                    placeholder={t('groups.create.maxMembersPlaceholder')}
                    keyboardType="number-pad"
                    maxLength={4}
                  />
                </Input>
                <FormControlHelper>
                  <FormControlHelperText>
                    {t('groups.create.maxMembersHelper')}
                  </FormControlHelperText>
                </FormControlHelper>
              </FormControl>

              {/* Open for Join */}
              <FormControl>
                <HStack
                  space="md"
                  className="items-center justify-between p-4 rounded-lg"
                  style={{ backgroundColor: colors.gray[50] }}
                >
                  <VStack className="flex-1">
                    <Text className="text-gray-900 font-semibold" size="md">
                      {t('groups.create.openForJoin')}
                    </Text>
                    <Text className="text-gray-600" size="sm">
                      {t('groups.create.openForJoinDesc')}
                    </Text>
                  </VStack>
                  <Switch
                    value={isOpenForJoin}
                    onValueChange={(value) => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setIsOpenForJoin(value);
                    }}
                    trackColor={{ false: colors.gray[300], true: colors.primary[500] }}
                    thumbColor="#ffffff"
                  />
                </HStack>
              </FormControl>
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
                <ButtonText>{t('groups.create.creating')}</ButtonText>
              </HStack>
            ) : (
              <ButtonText>{t('groups.create.create')}</ButtonText>
            )}
          </Button>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
