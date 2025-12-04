/**
 * ChatInputBar - WhatsApp iOS Style Message Input
 *
 * Exact WhatsApp iOS layout from left to right:
 * - Plus button (attachment) - outside, circular
 * - Text field container (white rounded pill):
 *   - Emoji/sticker button inside left
 *   - Text input middle
 *   - Camera button inside right (outline icon)
 * - Mic button (when no text) / Send button (when text) - outside, circular
 *
 * Features:
 * - Reply preview above input
 * - Auto-expand text input
 * - Voice note recording
 * - Attachment bottomsheet
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { memo, useRef, useState, useImperativeHandle, useCallback, useEffect, type Ref } from 'react';
import { View, Text, TextInput, Platform, Pressable, Keyboard, KeyboardEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import {
  X,
  Plus,
  Smile,
  Camera,
  Send,
  Mic,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// =============================================================================
// CONSTANTS - WhatsApp iOS Exact Colors
// =============================================================================

const COLORS = {
  // Bar background - lighter beige (matches chat screen and header)
  barBg: '#F5F2EC',

  // Input field
  inputBg: '#FFFFFF',
  inputBorder: '#E4E6EB',
  inputBorderFocused: '#25D366',

  // Text
  textPrimary: '#111B21',
  textPlaceholder: '#8696A0',

  // Icons - all grey outline style
  iconGrey: '#54656F',
  iconActive: '#128C7E',

  // Buttons - dark green for send (matches community screen)
  buttonGreen: '#075E54',

  // Reply
  replyBorder: '#25D366',
  replyBg: '#FFFFFF',
  replySender: '#25D366',
  replyText: '#667781',
};

// Spring configs for smooth animations
const SPRING_CONFIG = {
  damping: 15,
  stiffness: 300,
  mass: 0.8,
};

// =============================================================================
// TYPES
// =============================================================================

export interface ReplyData {
  id: string;
  senderName: string;
  preview: string;
}

export interface ChatInputBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onTyping?: () => void;
  onAttachmentPress: () => void;
  onGifPress: () => void;
  onVoiceSend: (uri: string, duration: number) => void;
  replyingTo?: ReplyData | null;
  onClearReply?: () => void;
  isSending?: boolean;
  isVoiceDisabled?: boolean;
  maxLength?: number;
  /** React 19: ref as regular prop (no forwardRef needed) */
  ref?: Ref<ChatInputBarRef>;
}

export interface ChatInputBarRef {
  focus: () => void;
  blur: () => void;
}

// =============================================================================
// ANIMATED PRESSABLE
// =============================================================================

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// =============================================================================
// ICON BUTTON COMPONENT (Outline style, grey icons)
// =============================================================================

interface IconButtonProps {
  onPress: () => void;
  icon: 'plus' | 'send' | 'mic' | 'camera';
  disabled?: boolean;
  isSending?: boolean;
}

const IconButton = memo(({ onPress, icon, disabled, isSending }: IconButtonProps) => {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [disabled, onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Send button is green filled, others are grey outline
  const isSendButton = icon === 'send';
  const iconColor = isSendButton ? '#FFFFFF' : COLORS.iconGrey;
  const iconSize = 26; // Larger icons for plus, camera, mic
  const strokeWidth = 2; // Clean outline icons

  const renderIcon = () => {
    switch (icon) {
      case 'plus':
        return <Plus size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'send':
        // Send icon centering fix:
        // Lucide Send icon points diagonally up-right. When rotated 45deg, it points right.
        // The icon's visual center is offset from its geometric center due to the arrow shape.
        // We rotate the container and shift to visually center in the round button.
        return (
          <View
            style={{
              width: 20,
              height: 20,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: '45deg' }, { translateX: -2.5 }, { translateY: 2 }],
            }}
          >
            <Send
              size={20}
              color={iconColor}
              strokeWidth={2.2}
            />
          </View>
        );
      case 'mic':
        return <Mic size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
      case 'camera':
        return <Camera size={iconSize} color={iconColor} strokeWidth={strokeWidth} />;
    }
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || isSending}
      className="w-11 h-11 rounded-full items-center justify-center"
      style={[
        isSendButton ? { backgroundColor: COLORS.buttonGreen } : undefined,
        animatedStyle,
      ]}
    >
      {renderIcon()}
    </AnimatedPressable>
  );
});

IconButton.displayName = 'IconButton';

// =============================================================================
// ICON BUTTON INSIDE TEXT FIELD
// =============================================================================

interface InlineIconButtonProps {
  onPress: () => void;
}

// Emoji button inside text field (only emoji now, camera moved outside)
const EmojiButton = memo(({ onPress }: InlineIconButtonProps) => {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.85, SPRING_CONFIG);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      className="pr-2 pl-1 py-1"
      style={animatedStyle}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Smile size={22} color={COLORS.iconGrey} strokeWidth={2} />
    </AnimatedPressable>
  );
});

EmojiButton.displayName = 'EmojiButton';

// =============================================================================
// REPLY PREVIEW COMPONENT
// =============================================================================

interface ReplyPreviewProps {
  senderName: string;
  preview: string;
  onClose: () => void;
}

const ReplyPreview = memo(({ senderName, preview, onClose }: ReplyPreviewProps) => (
  <Animated.View
    entering={FadeIn.duration(150)}
    exiting={FadeOut.duration(100)}
    className="mx-2 mt-2 rounded-xl overflow-hidden"
    style={{ backgroundColor: COLORS.replyBg }}
  >
    <View className="flex-row items-center">
      {/* Green accent bar */}
      <View
        className="w-1 self-stretch"
        style={{ backgroundColor: COLORS.replyBorder }}
      />
      <View className="flex-1 px-3 py-2.5">
        <Text
          className="text-[13px] font-semibold"
          style={{ color: COLORS.replySender }}
        >
          {senderName}
        </Text>
        <Text
          className="text-[13px] mt-0.5"
          style={{ color: COLORS.replyText }}
          numberOfLines={1}
        >
          {preview}
        </Text>
      </View>
      <Pressable
        onPress={onClose}
        className="p-2.5 mr-1"
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
      >
        <X size={18} color={COLORS.iconGrey} />
      </Pressable>
    </View>
  </Animated.View>
));

ReplyPreview.displayName = 'ReplyPreview';

// =============================================================================
// MAIN CHAT INPUT BAR COMPONENT (React 19: ref as prop, no forwardRef needed)
// =============================================================================

export const ChatInputBar = memo(
  ({
    value,
    onChangeText,
    onSend,
    onTyping,
    onAttachmentPress,
    onGifPress,
    onVoiceSend,
    replyingTo,
    onClearReply,
    isSending = false,
    isVoiceDisabled = false,
    maxLength = 4000,
    ref, // React 19: ref as regular prop
  }: ChatInputBarProps) => {
      const { t } = useTranslation();
      const insets = useSafeAreaInsets();
      const inputRef = useRef<TextInput>(null);
      const [isFocused, setIsFocused] = useState(false);
      const [keyboardVisible, setKeyboardVisible] = useState(false);

      // Track keyboard visibility for tight spacing when keyboard is open
      useEffect(() => {
        const showSub = Keyboard.addListener(
          Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
          () => setKeyboardVisible(true)
        );
        const hideSub = Keyboard.addListener(
          Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
          () => setKeyboardVisible(false)
        );
        return () => {
          showSub.remove();
          hideSub.remove();
        };
      }, []);

      // Expose focus/blur methods to parent
      useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
      }));

      const handleChangeText = useCallback((text: string) => {
        onChangeText(text);
        onTyping?.();
      }, [onChangeText, onTyping]);

      const handleAttachmentPress = useCallback(() => {
        // Dismiss keyboard first so bottomsheet isn't overlaid
        Keyboard.dismiss();
        // Small delay to let keyboard dismiss
        setTimeout(() => {
          onAttachmentPress();
        }, 100);
      }, [onAttachmentPress]);

      const handleEmojiPress = useCallback(() => {
        // For now, trigger GIF picker (can be expanded to emoji picker)
        onGifPress();
      }, [onGifPress]);

      const handleCameraPress = useCallback(() => {
        // Dismiss keyboard and open attachment picker (camera mode)
        Keyboard.dismiss();
        setTimeout(() => {
          onAttachmentPress();
        }, 100);
      }, [onAttachmentPress]);

      const handleMicPress = useCallback(() => {
        // Trigger voice recording through attachment picker
        Keyboard.dismiss();
        setTimeout(() => {
          onAttachmentPress();
        }, 100);
      }, [onAttachmentPress]);

      const hasText = value.trim().length > 0;

      // Animated styles for smooth horizontal slide transitions
      // Button width = 44px (w-11)
      const BUTTON_WIDTH = 44;
      const TWO_BUTTONS_WIDTH = BUTTON_WIDTH * 2;
      const ONE_BUTTON_WIDTH = BUTTON_WIDTH;
      const DURATION = 200;

      // Initialize based on current state to prevent flash on mount
      const containerWidth = useSharedValue(hasText ? ONE_BUTTON_WIDTH : TWO_BUTTONS_WIDTH);
      const cameraMicTranslateX = useSharedValue(hasText ? 60 : 0);
      const cameraMicOpacity = useSharedValue(hasText ? 0 : 1);
      const sendTranslateX = useSharedValue(hasText ? 0 : 40);
      const sendOpacity = useSharedValue(hasText ? 1 : 0);

      // Track previous hasText to animate only on change
      const prevHasText = useRef(hasText);

      // Update animation values when hasText changes
      useEffect(() => {
        // Skip animation on first render
        if (prevHasText.current === hasText) return;
        prevHasText.current = hasText;

        if (hasText) {
          // Slide camera+mic out to the right, slide send in
          containerWidth.value = withTiming(ONE_BUTTON_WIDTH, { duration: DURATION });
          cameraMicTranslateX.value = withTiming(60, { duration: DURATION });
          cameraMicOpacity.value = withTiming(0, { duration: DURATION * 0.7 });
          sendTranslateX.value = withTiming(0, { duration: DURATION });
          sendOpacity.value = withTiming(1, { duration: DURATION });
        } else {
          // Slide send out, slide camera+mic back in
          containerWidth.value = withTiming(TWO_BUTTONS_WIDTH, { duration: DURATION });
          cameraMicTranslateX.value = withTiming(0, { duration: DURATION });
          cameraMicOpacity.value = withTiming(1, { duration: DURATION });
          sendTranslateX.value = withTiming(40, { duration: DURATION * 0.7 });
          sendOpacity.value = withTiming(0, { duration: DURATION * 0.7 });
        }
      }, [hasText]);

      const containerStyle = useAnimatedStyle(() => ({
        width: containerWidth.value,
        height: BUTTON_WIDTH,
      }));

      const sendButtonStyle = useAnimatedStyle(() => ({
        opacity: sendOpacity.value,
        transform: [{ translateX: sendTranslateX.value }],
      }));

      const cameraMicStyle = useAnimatedStyle(() => ({
        opacity: cameraMicOpacity.value,
        transform: [{ translateX: cameraMicTranslateX.value }],
      }));

      return (
        <View style={{ backgroundColor: COLORS.barBg }}>
          {/* Reply preview */}
          {replyingTo && (
            <ReplyPreview
              senderName={replyingTo.senderName}
              preview={replyingTo.preview}
              onClose={onClearReply || (() => {})}
            />
          )}

          {/* Input bar - WhatsApp iOS exact layout, all vertically centered */}
          {/* pl-2 pr-1 ensures equal spacing: 4px gap on left of send = 4px padding on right */}
          <View
            className="flex-row items-center pl-2 pr-1 gap-1"
            style={{ paddingVertical: 6 }}
          >
            {/* Plus button (attachment) - outside left, grey outline */}
            <IconButton
              icon="plus"
              onPress={handleAttachmentPress}
            />

            {/* Text field container - white rounded pill, thin grey border, compact height */}
            <View
              className="flex-1 flex-row items-center rounded-[20px]"
              style={{
                backgroundColor: COLORS.inputBg,
                borderWidth: 0.5,
                borderColor: COLORS.inputBorder,
                minHeight: 32,
                maxHeight: 100,
              }}
            >
              {/* Text input - 1px vertical padding, larger font for better cursor visibility */}
              <TextInput
                ref={inputRef}
                value={value}
                onChangeText={handleChangeText}
                placeholder=""
                multiline
                maxLength={maxLength}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="flex-1 text-[18px]"
                style={{
                  color: COLORS.textPrimary,
                  paddingTop: 1,
                  paddingBottom: 1,
                  paddingLeft: 12,
                  paddingRight: 4,
                  maxHeight: 80,
                  lineHeight: 24,
                }}
                cursorColor={COLORS.iconActive}
                selectionColor={COLORS.iconActive + '40'}
              />

              {/* Emoji/sticker button inside right */}
              <EmojiButton onPress={handleEmojiPress} />
            </View>

            {/* WhatsApp style: Camera+Mic when empty, Send only when typing */}
            {/* Horizontal slide animation with animated container width */}
            <Animated.View
              style={[
                {
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                containerStyle,
              ]}
            >
              {/* Camera + Mic buttons - slide out to right */}
              <Animated.View
                style={[
                  {
                    flexDirection: 'row',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                  },
                  cameraMicStyle,
                ]}
                pointerEvents={hasText ? 'none' : 'auto'}
              >
                <IconButton
                  icon="camera"
                  onPress={handleCameraPress}
                />
                <IconButton
                  icon="mic"
                  onPress={handleMicPress}
                  disabled={isVoiceDisabled}
                />
              </Animated.View>

              {/* Send button - slide in from right */}
              <Animated.View
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                  },
                  sendButtonStyle,
                ]}
                pointerEvents={hasText ? 'auto' : 'none'}
              >
                <IconButton
                  icon="send"
                  onPress={onSend}
                  disabled={!hasText}
                  isSending={isSending}
                />
              </Animated.View>
            </Animated.View>
          </View>

          {/* Bottom padding - zero when keyboard visible, safe area when not */}
          <View style={{ height: keyboardVisible ? 0 : Math.max(insets.bottom, 5) }} />
        </View>
      );
  }
);

ChatInputBar.displayName = 'ChatInputBar';

export default ChatInputBar;
