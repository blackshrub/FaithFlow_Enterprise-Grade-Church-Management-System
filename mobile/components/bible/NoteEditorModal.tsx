/**
 * Note Editor Modal
 *
 * YouVersion-style note editor for verse annotations:
 * - Text area for note input
 * - Save and cancel buttons
 * - Keyboard-aware bottom sheet
 * - Shows verse reference in header
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Save, X } from 'lucide-react-native';
import { BottomSheetModal, BottomSheetBackdrop as GorhomBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { colors } from '@/constants/theme';

interface NoteEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  verseReference: string; // e.g., "Genesis 1:1"
  initialNote?: string;
  onSave: (note: string) => void;
}

export function NoteEditorModal({
  isOpen,
  onClose,
  verseReference,
  initialNote = '',
  onSave,
}: NoteEditorModalProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState(initialNote);

  // Calculate insets
  const bottomInset = insets.bottom;
  const topInset = insets.top || 20;

  // Control bottom sheet based on isOpen prop
  useEffect(() => {
    console.log('🔄 NoteEditorModal useEffect - isOpen:', isOpen);
    console.log('📍 BottomSheet ref:', bottomSheetRef.current);

    if (isOpen) {
      console.log('✅ Presenting NoteEditorModal...');
      console.log('Verse reference:', verseReference);
      console.log('Initial note:', initialNote);

      // Use setTimeout to ensure modal presents after render cycle
      setTimeout(() => {
        console.log('⏰ Calling present() after timeout...');
        bottomSheetRef.current?.present();
      }, 100);

      setNote(initialNote); // Reset note to initial value when opening
    } else {
      console.log('❌ Dismissing NoteEditorModal...');
      bottomSheetRef.current?.dismiss();
    }
  }, [isOpen, initialNote, verseReference]);

  const handleSave = () => {
    onSave(note.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleCancel = () => {
    setNote(initialNote); // Reset to initial value
    onClose();
  };

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <GorhomBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        onPress={handleCancel}
      />
    ),
    [handleCancel]
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['75%']}
      enablePanDownToClose
      bottomInset={bottomInset}
      topInset={topInset}
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: '#ffffff',
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1, paddingBottom: 20 }}>
          {/* Header */}
          <View className="px-6 pt-2 pb-4 border-b border-gray-200">
            <HStack className="items-center justify-between">
              <VStack space="xs" className="flex-1">
                <Heading size="xl" className="text-gray-900">
                  {t('bible.addNote') || 'Add Note'}
                </Heading>
                <Text className="text-primary-600 font-medium text-sm">
                  {verseReference}
                </Text>
              </VStack>

              {/* Close Button */}
              <Pressable
                onPress={handleCancel}
                className="active:opacity-60"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon as={X} size="lg" className="text-gray-400" />
              </Pressable>
            </HStack>
          </View>

          {/* Note Input */}
          <View className="flex-1 p-6">
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('bible.notePlaceholder') || 'Add your thoughts, reflections, or insights...'}
              placeholderTextColor={colors.gray[400]}
              multiline
              style={{
                flex: 1,
                fontSize: 16,
                lineHeight: 24,
                color: colors.gray[900],
                textAlignVertical: 'top',
                padding: 0,
              }}
            />
          </View>

          {/* Action Buttons */}
          <View className="px-6 py-4 border-t border-gray-200">
            <HStack space="sm">
              {/* Cancel Button */}
              <Pressable
                onPress={handleCancel}
                className="flex-1 active:opacity-70"
              >
                <View
                  className="py-3 px-4 rounded-lg items-center justify-center"
                  style={{
                    backgroundColor: colors.gray[100],
                  }}
                >
                  <Text className="text-gray-700 font-semibold text-base">
                    {t('common.cancel') || 'Cancel'}
                  </Text>
                </View>
              </Pressable>

              {/* Save Button */}
              <Pressable
                onPress={handleSave}
                className="flex-1 active:opacity-70"
                disabled={note.trim().length === 0}
              >
                <View
                  className="py-3 px-4 rounded-lg items-center justify-center flex-row gap-2"
                  style={{
                    backgroundColor:
                      note.trim().length > 0 ? colors.primary[500] : colors.gray[300],
                  }}
                >
                  <Icon
                    as={Save}
                    size="sm"
                    className={note.trim().length > 0 ? 'text-white' : 'text-gray-400'}
                  />
                  <Text
                    className="font-semibold text-base"
                    style={{
                      color: note.trim().length > 0 ? '#ffffff' : colors.gray[500],
                    }}
                  >
                    {t('common.save') || 'Save'}
                  </Text>
                </View>
              </Pressable>
            </HStack>
          </View>
        </View>
      </KeyboardAvoidingView>
    </BottomSheetModal>
  );
}
