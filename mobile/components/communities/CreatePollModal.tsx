/**
 * Create Poll Modal
 *
 * Bottom sheet modal for creating polls in community chat:
 * - Question input
 * - Multiple option inputs (min 2, max 10)
 * - Allow multiple selections toggle
 * - Anonymous voting toggle
 * - Poll duration (optional)
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  X,
  BarChart3,
  Plus,
  Trash2,
  Clock,
  Users,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Button, ButtonText, ButtonSpinner, ButtonIcon } from '@/components/ui/button';
import { Switch } from 'react-native';

import { useCreatePoll } from '@/hooks/useCommunities';
import { colors, spacing, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

interface CreatePollModalProps {
  visible: boolean;
  communityId: string;
  channelType: 'general' | 'announcement' | 'subgroup';
  subgroupId?: string;
  onClose: () => void;
  onCreated: () => void;
}

interface PollOption {
  id: string;
  text: string;
}

// =============================================================================
// DURATION OPTIONS
// =============================================================================

const DURATION_OPTIONS: Array<{ value: number | undefined; label: string }> = [
  { value: undefined, label: 'No limit' },
  { value: 1, label: '1 hour' },
  { value: 6, label: '6 hours' },
  { value: 24, label: '1 day' },
  { value: 72, label: '3 days' },
  { value: 168, label: '1 week' },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function CreatePollModal({
  visible,
  communityId,
  channelType,
  subgroupId,
  onClose,
  onCreated,
}: CreatePollModalProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['85%'], []);

  // Form state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [durationHours, setDurationHours] = useState<number | undefined>(24);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  const createPollMutation = useCreatePoll();

  // Validation
  const validOptions = options.filter((opt) => opt.text.trim().length > 0);
  const canSubmit = question.trim().length >= 3 && validOptions.length >= 2;

  const resetForm = () => {
    setQuestion('');
    setOptions([
      { id: '1', text: '' },
      { id: '2', text: '' },
    ]);
    setAllowMultiple(false);
    setIsAnonymous(false);
    setDurationHours(24);
  };

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetForm();
    onClose();
  }, [onClose]);

  const handleAddOption = () => {
    if (options.length >= 10) {
      Alert.alert('Maximum Options', 'You can add up to 10 options.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOptions([...options, { id: String(Date.now()), text: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length <= 2) {
      Alert.alert('Minimum Options', 'A poll must have at least 2 options.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOptions(options.filter((opt) => opt.id !== id));
  };

  const handleOptionChange = (id: string, text: string) => {
    setOptions(options.map((opt) => (opt.id === id ? { ...opt, text } : opt)));
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await createPollMutation.mutateAsync({
        communityId,
        channelType,
        subgroupId,
        question: question.trim(),
        options: validOptions.map((opt) => opt.text.trim()),
        allowMultiple,
        isAnonymous,
        durationHours,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetForm();
      onCreated();
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to create poll'
      );
    }
  };

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

  const selectedDuration = DURATION_OPTIONS.find((d) => d.value === durationHours);

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
                <Icon as={BarChart3} size="lg" style={{ color: colors.primary[600] }} />
              </View>
              <Heading size="xl" className="text-gray-900">
                Create Poll
              </Heading>
            </HStack>

            <Pressable
              onPress={handleClose}
              className="p-2 active:opacity-70"
            >
              <Icon as={X} size="md" className="text-gray-500" />
            </Pressable>
          </HStack>

          {/* Question Input */}
          <VStack space="sm" className="mb-4">
            <Text className="text-gray-700 font-medium">
              Question <Text className="text-error-500">*</Text>
            </Text>
            <TextInput
              value={question}
              onChangeText={setQuestion}
              placeholder="Ask a question..."
              placeholderTextColor={colors.gray[400]}
              maxLength={200}
              multiline
              numberOfLines={2}
              className="px-4 py-3 rounded-xl text-base"
              style={{
                backgroundColor: colors.gray[100],
                color: colors.gray[900],
                minHeight: 60,
                textAlignVertical: 'top',
              }}
            />
            <Text className="text-gray-500 text-xs text-right">
              {question.length}/200
            </Text>
          </VStack>

          {/* Options */}
          <VStack space="sm" className="mb-4">
            <Text className="text-gray-700 font-medium">
              Options <Text className="text-error-500">*</Text>
              <Text className="text-gray-400 font-normal"> (min 2, max 10)</Text>
            </Text>

            {options.map((option, index) => (
              <HStack key={option.id} space="sm" className="items-center">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{ backgroundColor: colors.gray[200] }}
                >
                  <Text className="text-gray-600 font-medium text-sm">
                    {index + 1}
                  </Text>
                </View>
                <TextInput
                  value={option.text}
                  onChangeText={(text) => handleOptionChange(option.id, text)}
                  placeholder={`Option ${index + 1}`}
                  placeholderTextColor={colors.gray[400]}
                  maxLength={100}
                  className="flex-1 px-4 py-3 rounded-xl text-base"
                  style={{
                    backgroundColor: colors.gray[100],
                    color: colors.gray[900],
                  }}
                />
                {options.length > 2 && (
                  <Pressable
                    onPress={() => handleRemoveOption(option.id)}
                    className="p-2 active:opacity-70"
                  >
                    <Icon as={Trash2} size="sm" className="text-gray-400" />
                  </Pressable>
                )}
              </HStack>
            ))}

            {options.length < 10 && (
              <Pressable
                onPress={handleAddOption}
                className="flex-row items-center justify-center py-3 rounded-xl border border-dashed active:bg-gray-50"
                style={{ borderColor: colors.gray[300] }}
              >
                <Icon as={Plus} size="sm" className="text-gray-500 mr-2" />
                <Text className="text-gray-500">Add option</Text>
              </Pressable>
            )}
          </VStack>

          {/* Settings */}
          <VStack space="sm" className="mb-4">
            <Text className="text-gray-700 font-medium mb-2">Settings</Text>

            {/* Duration */}
            <View>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDurationPicker(!showDurationPicker);
                }}
                className="px-4 py-3 rounded-xl flex-row items-center justify-between active:bg-gray-50"
                style={{ backgroundColor: colors.gray[100] }}
              >
                <HStack space="md" className="items-center">
                  <Icon as={Clock} size="sm" style={{ color: colors.primary[500] }} />
                  <Text className="text-gray-900">Duration</Text>
                </HStack>
                <Text className="text-primary-600 font-medium">
                  {selectedDuration?.label}
                </Text>
              </Pressable>

              {showDurationPicker && (
                <View className="mt-2 p-2 rounded-xl bg-white border border-gray-200">
                  {DURATION_OPTIONS.map((option) => (
                    <Pressable
                      key={option.label}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setDurationHours(option.value);
                        setShowDurationPicker(false);
                      }}
                      className="py-2.5 px-3 flex-row items-center justify-between rounded-lg active:bg-gray-50"
                    >
                      <Text
                        className={`${
                          option.value === durationHours
                            ? 'text-primary-600 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </Text>
                      {option.value === durationHours && (
                        <Icon as={Check} size="sm" style={{ color: colors.primary[600] }} />
                      )}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Allow Multiple */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAllowMultiple(!allowMultiple);
              }}
              className="px-4 py-3 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <HStack space="md" className="items-center">
                <Icon as={Users} size="sm" style={{ color: colors.info[500] }} />
                <Text className="text-gray-900">Allow multiple answers</Text>
              </HStack>
              <Switch
                value={allowMultiple}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setAllowMultiple(value);
                }}
                trackColor={{ false: colors.gray[300], true: colors.primary[500] }}
                thumbColor="white"
              />
            </Pressable>

            {/* Anonymous Voting */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsAnonymous(!isAnonymous);
              }}
              className="px-4 py-3 rounded-xl flex-row items-center justify-between"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <HStack space="md" className="items-center">
                <Icon
                  as={isAnonymous ? EyeOff : Eye}
                  size="sm"
                  style={{ color: colors.warning[500] }}
                />
                <Text className="text-gray-900">Anonymous voting</Text>
              </HStack>
              <Switch
                value={isAnonymous}
                onValueChange={(value) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsAnonymous(value);
                }}
                trackColor={{ false: colors.gray[300], true: colors.primary[500] }}
                thumbColor="white"
              />
            </Pressable>
          </VStack>

          {/* Submit Button */}
          <Button
            size="lg"
            variant="solid"
            action="primary"
            onPress={handleSubmit}
            disabled={!canSubmit || createPollMutation.isPending}
            className="mt-2"
          >
            {createPollMutation.isPending ? (
              <ButtonSpinner className="mr-2" />
            ) : (
              <ButtonIcon as={BarChart3} className="mr-2" />
            )}
            <ButtonText>
              {createPollMutation.isPending ? 'Creating...' : 'Create Poll'}
            </ButtonText>
          </Button>
        </BottomSheetScrollView>
      </KeyboardAvoidingView>
    </BottomSheet>
  );
}

export default CreatePollModal;
