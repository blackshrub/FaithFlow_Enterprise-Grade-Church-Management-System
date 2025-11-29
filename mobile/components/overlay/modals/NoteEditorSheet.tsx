/**
 * NoteEditorSheet - Unified Overlay System
 *
 * Bible verse note editor sheet.
 * Used via: overlay.showBottomSheet(NoteEditorSheet, payload)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Save } from 'lucide-react-native';

import type { OverlayProps } from '@/components/overlay/types';
import type { NoteEditorPayload } from '@/stores/overlayStore';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { overlayTheme } from '@/theme/overlayTheme';
import { interaction } from '@/constants/interaction';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const NoteEditorSheet: React.FC<OverlayProps<NoteEditorPayload>> = ({
  payload,
  onClose,
}) => {
  const { t } = useTranslation();

  if (!payload) return null;

  const [note, setNote] = useState(payload.existingNote || '');

  const handleSave = useCallback(() => {
    interaction.haptics.success();
    if (payload.onSave) {
      payload.onSave(note.trim());
    }
    onClose();
  }, [payload, note, onClose]);

  const verseReference = `${payload.book} ${payload.chapter}:${payload.verse}`;

  return (
    <View style={styles.sheetCard}>
      {/* Handle indicator */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheetContent}>
          {/* Header */}
          <HStack className="justify-between items-center mb-4">
            <VStack className="flex-1">
              <Heading size="lg" className="text-gray-900 font-bold">
                {t('bible.addNote')}
              </Heading>
              <Text className="text-primary-600 font-semibold text-sm">
                {verseReference}
              </Text>
            </VStack>

            <Pressable
              onPress={() => {
                interaction.haptics.tap();
                onClose();
              }}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressedMicro,
              ]}
            >
              <Icon as={X} size="md" className="text-gray-600" />
            </Pressable>
          </HStack>

          {/* Note Input */}
          <View style={styles.textInputContainer}>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t('bible.notePlaceholder')}
              placeholderTextColor={colors.gray[400]}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              style={[styles.textInput, { minHeight: 200 }]}
              autoFocus
            />
          </View>

          {/* Actions */}
          <HStack space="md" className="mt-4">
            <Button
              variant="outline"
              onPress={() => {
                interaction.haptics.tap();
                onClose();
              }}
              className="flex-1"
            >
              <ButtonText>{t('common.cancel')}</ButtonText>
            </Button>
            <Button onPress={handleSave} className="flex-1">
              <Icon as={Save} size="sm" className="text-white mr-2" />
              <ButtonText className="font-bold">{t('common.save')}</ButtonText>
            </Button>
          </HStack>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetCard: {
    backgroundColor: overlayTheme.sheet.backgroundColor,
    borderTopLeftRadius: overlayTheme.sheet.borderRadiusTop,
    borderTopRightRadius: overlayTheme.sheet.borderRadiusTop,
    maxHeight: SCREEN_HEIGHT * 0.8,
    shadowColor: overlayTheme.modal.shadow.color,
    shadowOpacity: overlayTheme.modal.shadow.opacity,
    shadowRadius: overlayTheme.modal.shadow.radius,
    shadowOffset: overlayTheme.modal.shadow.offset,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: overlayTheme.sheet.handleWidth,
    height: overlayTheme.sheet.handleHeight,
    borderRadius: overlayTheme.sheet.handleHeight / 2,
    backgroundColor: overlayTheme.sheet.handleColor,
  },
  sheetContent: {
    padding: spacing.xl,
  },
  closeButton: {
    width: overlayTheme.closeButton.size,
    height: overlayTheme.closeButton.size,
    borderRadius: overlayTheme.closeButton.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overlayTheme.closeButton.backgroundColor,
  },
  pressedMicro: {
    opacity: interaction.press.opacity,
    transform: [{ scale: interaction.press.scale }],
  },
  textInputContainer: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  textInput: {
    padding: spacing.lg,
    fontSize: 16,
    lineHeight: 24,
    color: colors.gray[900],
    minHeight: 120,
  },
});

export default NoteEditorSheet;
