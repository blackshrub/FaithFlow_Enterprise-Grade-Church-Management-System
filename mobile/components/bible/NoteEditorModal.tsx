/**
 * Note Editor Modal
 *
 * YouVersion-style note editor for verse annotations:
 * - Text area for note input
 * - Save and cancel buttons
 * - Keyboard-aware bottom sheet
 * - Shows verse reference in header
 */

import React, { useState } from 'react';
import { View, Pressable, TextInput, KeyboardAvoidingView, Platform, Modal, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Save, X } from 'lucide-react-native';
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [note, setNote] = useState(initialNote);

  // Update note when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setNote(initialNote);
      console.log('✅ NoteEditorModal opened with note:', initialNote);
    }
  }, [isOpen, initialNote]);

  const handleSave = () => {
    onSave(note.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleCancel = () => {
    setNote(initialNote);
    onClose();
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={handleCancel}>
        <View />
      </Pressable>

      {/* Modal Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.content, { paddingBottom: insets.bottom + 20 }]}>
          {/* Header */}
          <View className="px-6 pt-6 pb-4 border-b border-gray-200">
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '75%',
  },
  content: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
});
