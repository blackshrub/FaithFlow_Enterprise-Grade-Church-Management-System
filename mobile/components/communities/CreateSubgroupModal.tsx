/**
 * Create Sub-group Modal
 *
 * Modal for creating a new sub-group within a community:
 * - Name input
 * - Description input (optional)
 * - Validation
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { X, Users } from 'lucide-react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';

import { useCreateSubgroup } from '@/hooks/useCommunities';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { CommunitySubgroup } from '@/types/communities';

// =============================================================================
// TYPES
// =============================================================================

interface CreateSubgroupModalProps {
  visible: boolean;
  communityId: string;
  onClose: () => void;
  onCreated: (subgroup: CommunitySubgroup) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function CreateSubgroupModal({
  visible,
  communityId,
  onClose,
  onCreated,
}: CreateSubgroupModalProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%'], []);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const createSubgroupMutation = useCreateSubgroup();

  const canSubmit = name.trim().length >= 2;

  const resetForm = () => {
    setName('');
    setDescription('');
  };

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    onClose();
  }, [onClose]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const subgroup = await createSubgroupMutation.mutateAsync({
        communityId,
        name: name.trim(),
        description: description.trim() || undefined,
      });

      resetForm();
      onCreated(subgroup);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create sub-group'
      );
    }
  }, [canSubmit, communityId, name, description, createSubgroupMutation, onCreated]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      onClose={handleClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.gray[300] }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <BottomSheetScrollView
          contentContainerStyle={{ padding: spacing.lg }}
        >
          {/* Header */}
          <HStack className="justify-between items-center mb-6">
            <HStack space="md" className="items-center">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.primary[100] }}
              >
                <Icon as={Users} size="lg" style={{ color: colors.primary[600] }} />
              </View>
              <Heading size="xl" className="text-gray-900">
                Create Sub-group
              </Heading>
            </HStack>

            <Pressable
              onPress={handleClose}
              className="p-2 active:opacity-70"
              accessible
              accessibilityRole="button"
              accessibilityLabel="Close create sub-group modal"
            >
              <Icon as={X} size="md" className="text-gray-500" />
            </Pressable>
          </HStack>

          {/* Form */}
          <VStack space="lg">
            {/* Name input */}
            <VStack space="sm">
              <Text className="text-gray-700 font-medium">
                Name <Text className="text-error-500">*</Text>
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g., Prayer Warriors, Worship Team"
                placeholderTextColor={colors.gray[400]}
                maxLength={50}
                className="px-4 py-3 rounded-xl text-base"
                style={{
                  backgroundColor: colors.gray[100],
                  color: colors.gray[900],
                }}
              />
              <Text className="text-gray-500 text-xs text-right">
                {name.length}/50
              </Text>
            </VStack>

            {/* Description input */}
            <VStack space="sm">
              <Text className="text-gray-700 font-medium">
                Description <Text className="text-gray-400">(optional)</Text>
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What is this sub-group about?"
                placeholderTextColor={colors.gray[400]}
                multiline
                numberOfLines={3}
                maxLength={200}
                className="px-4 py-3 rounded-xl text-base"
                style={{
                  backgroundColor: colors.gray[100],
                  color: colors.gray[900],
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
              />
              <Text className="text-gray-500 text-xs text-right">
                {description.length}/200
              </Text>
            </VStack>

            {/* Info text */}
            <View
              className="p-4 rounded-xl"
              style={{ backgroundColor: colors.primary[50] }}
            >
              <Text className="text-primary-700 text-sm">
                Sub-groups let you create smaller discussion spaces within your community.
                Members can join sub-groups to discuss specific topics or coordinate activities.
              </Text>
            </View>

            {/* Submit button */}
            <Button
              size="lg"
              variant="solid"
              action="primary"
              onPress={handleSubmit}
              disabled={!canSubmit || createSubgroupMutation.isPending}
              className="mt-2"
            >
              {createSubgroupMutation.isPending ? (
                <ButtonSpinner className="mr-2" />
              ) : null}
              <ButtonText>
                {createSubgroupMutation.isPending ? 'Creating...' : 'Create Sub-group'}
              </ButtonText>
            </Button>
          </VStack>
        </BottomSheetScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

export default CreateSubgroupModal;
