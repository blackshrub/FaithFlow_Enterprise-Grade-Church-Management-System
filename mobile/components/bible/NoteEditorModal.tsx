/**
 * Note Editor Modal - Root Level Component
 *
 * YouVersion-style note editor for verse annotations:
 * - Uses BottomSheetModal with proper portal rendering
 * - Controlled by global Zustand store (useBibleUIStore)
 * - Keyboard-aware bottom sheet
 * - Shows verse reference in header
 *
 * IMPORTANT: This component must be rendered at ROOT LEVEL (_layout.tsx)
 * to ensure proper portal rendering with @gorhom/bottom-sheet
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Pressable, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Save, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import BottomSheet, {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { colors } from '@/constants/theme';
import { useBibleUIStore } from '@/stores/bibleUIStore';

export function NoteEditorModal() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);

  // Get state from global store
  const { noteEditor, closeNoteEditor } = useBibleUIStore();
  const { isOpen, verseReference, initialNote, onSave } = noteEditor;

  const [note, setNote] = useState('');

  // Snap points for the bottom sheet
  const snapPoints = useMemo(() => ['75%'], []);

  // Update note when modal opens
  useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
      bottomSheetModalRef.current?.present();
    } else {
      bottomSheetModalRef.current?.dismiss();
    }
  }, [isOpen, initialNote]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(note.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    closeNoteEditor();
  }, [note, onSave, closeNoteEditor]);

  const handleCancel = useCallback(() => {
    setNote(initialNote);
    closeNoteEditor();
  }, [initialNote, closeNoteEditor]);

  const handleSheetDismiss = useCallback(() => {
    closeNoteEditor();
  }, [closeNoteEditor]);

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
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
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture
      onDismiss={handleSheetDismiss}
      backdropComponent={renderBackdrop}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{
        backgroundColor: '#ffffff',
      }}
    >
      <BottomSheetView style={{ flex: 1, paddingBottom: insets.bottom }}>
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
          <BottomSheetTextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('bible.notePlaceholder') || 'Add your thoughts, reflections, or insights...'}
            placeholderTextColor={colors.gray[400]}
            multiline
            autoFocus
            style={{
              flex: 1,
              fontSize: 16,
              lineHeight: 24,
              color: colors.gray[900],
              textAlignVertical: 'top',
              padding: 0,
              minHeight: 200,
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
      </BottomSheetView>
    </BottomSheetModal>
  );
}
