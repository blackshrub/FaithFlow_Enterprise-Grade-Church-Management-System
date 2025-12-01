/**
 * OverlayModal - V5 Design System
 *
 * Generic modal shell with unified design tokens.
 * Uses SharedAxisY animation for Material Design 3 transitions.
 *
 * Features:
 * - Scrim backdrop with blur
 * - Centered card with consistent styling
 * - Header with optional icon
 * - Close button
 * - Footer slot for actions
 * - Keyboard avoiding behavior
 * - Android back button handling
 *
 * Styling: NativeWind-first with inline style for dynamic/theme values
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Pressable,
  Dimensions,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { overlayTheme } from '@/theme/overlayTheme';
import { interaction } from '@/constants/interaction';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ==========================================================================
// TYPES
// ==========================================================================

export interface OverlayModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal subtitle */
  subtitle?: string;
  /** Icon to display in header */
  icon?: React.ReactNode;
  /** Modal content */
  children: React.ReactNode;
  /** Footer content (typically action buttons) */
  footer?: React.ReactNode;
  /** Custom max width */
  maxWidth?: number;
  /** Whether to close on backdrop press (default: true) */
  closeOnBackdropPress?: boolean;
  /** Whether to show close button (default: true) */
  showCloseButton?: boolean;
  /** Whether to handle Android back button (default: true) */
  handleBackButton?: boolean;
  /** Whether to wrap content in KeyboardAvoidingView (default: true) */
  keyboardAvoiding?: boolean;
  /** Callback when enter animation completes */
  onEnterComplete?: () => void;
  /** Callback when exit animation completes */
  onExitComplete?: () => void;
}

// ==========================================================================
// COMPONENT
// ==========================================================================

export function OverlayModal({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = overlayTheme.modal.maxWidth,
  closeOnBackdropPress = true,
  showCloseButton = true,
  handleBackButton = true,
  keyboardAvoiding = true,
  onEnterComplete,
  onExitComplete,
}: OverlayModalProps) {
  // Track if modal should render (allows exit animation to complete)
  const [shouldRender, setShouldRender] = useState(false);
  const exitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue<number>(overlayTheme.animation.enter.scale);
  const cardTranslateY = useSharedValue<number>(overlayTheme.animation.enter.translateY);
  const cardOpacity = useSharedValue(0);

  // Handle visibility changes
  useEffect(() => {
    // Clear any pending exit timeout
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current);
      exitTimeoutRef.current = null;
    }

    if (visible) {
      // Show: immediately render, animate in
      setShouldRender(true);

      // Animate backdrop
      backdropOpacity.value = withTiming(1, {
        duration: overlayTheme.animation.backdrop.fadeDuration,
        easing: Easing.out(Easing.cubic),
      });

      // Animate card - shared axis Y enter
      cardScale.value = withTiming(1, {
        duration: overlayTheme.animation.enter.duration,
        easing: Easing.out(Easing.cubic),
      });
      cardTranslateY.value = withTiming(0, {
        duration: overlayTheme.animation.enter.duration,
        easing: Easing.out(Easing.cubic),
      });
      cardOpacity.value = withTiming(1, {
        duration: overlayTheme.animation.enter.duration,
        easing: Easing.out(Easing.cubic),
      });

      // Call enter complete after animation
      setTimeout(() => {
        onEnterComplete?.();
      }, overlayTheme.animation.enter.duration);
    } else if (shouldRender) {
      // Hide: animate out, then stop rendering
      backdropOpacity.value = withTiming(0, {
        duration: overlayTheme.animation.exit.duration,
        easing: Easing.in(Easing.cubic),
      });
      cardOpacity.value = withTiming(0, {
        duration: overlayTheme.animation.exit.duration,
        easing: Easing.in(Easing.cubic),
      });

      // Schedule removal after exit animation
      exitTimeoutRef.current = setTimeout(() => {
        setShouldRender(false);
        // Reset values for next open
        cardScale.value = overlayTheme.animation.enter.scale;
        cardTranslateY.value = overlayTheme.animation.enter.translateY;
        onExitComplete?.();
      }, overlayTheme.animation.exit.duration);
    }

    return () => {
      if (exitTimeoutRef.current) {
        clearTimeout(exitTimeoutRef.current);
      }
    };
  }, [visible]);

  // Handle Android back button
  useEffect(() => {
    if (!visible || !handleBackButton) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        handleClose();
        return true;
      }
      return false;
    });

    return () => backHandler.remove();
  }, [visible, handleBackButton]);

  // Handle close with haptic
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  // Handle backdrop press
  const handleBackdropPress = useCallback(() => {
    if (closeOnBackdropPress) {
      handleClose();
    }
  }, [closeOnBackdropPress, handleClose]);

  // Animated styles
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [
      { scale: cardScale.value },
      { translateY: cardTranslateY.value },
    ],
  }));

  // Don't render if not visible
  if (!shouldRender) {
    return null;
  }

  // Content wrapper (with or without keyboard avoiding)
  const ContentWrapper = keyboardAvoiding ? KeyboardAvoidingView : View;
  const wrapperProps = keyboardAvoiding
    ? {
        behavior: Platform.OS === 'ios' ? 'padding' as const : 'height' as const,
        className: 'flex-1 justify-center items-center px-4',
      }
    : { className: 'flex-1 justify-center items-center px-4' };

  return (
    <View
      className="absolute inset-0 justify-center items-center"
      style={{ zIndex: 9999 }}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* Backdrop with blur */}
      <Animated.View className="absolute inset-0" style={backdropAnimatedStyle}>
        <Pressable className="absolute inset-0" onPress={handleBackdropPress}>
          <BlurView
            intensity={overlayTheme.scrim.blurIntensity}
            className="absolute inset-0"
            tint="dark"
          />
          <View
            className="absolute inset-0"
            style={{ backgroundColor: overlayTheme.scrim.color }}
          />
        </Pressable>
      </Animated.View>

      {/* Modal card */}
      <ContentWrapper {...wrapperProps}>
        <Animated.View
          className="w-full rounded-3xl"
          style={[
            {
              maxWidth,
              maxHeight: SCREEN_HEIGHT - 100,
              backgroundColor: overlayTheme.modal.backgroundColor,
              borderWidth: overlayTheme.modal.borderWidth,
              borderColor: overlayTheme.modal.borderColor,
              padding: overlayTheme.modal.padding,
              shadowColor: overlayTheme.modal.shadow.color,
              shadowOpacity: overlayTheme.modal.shadow.opacity,
              shadowRadius: overlayTheme.modal.shadow.radius,
              shadowOffset: overlayTheme.modal.shadow.offset,
              elevation: 12,
            },
            cardAnimatedStyle,
          ]}
        >
          {/* Close button */}
          {showCloseButton && (
            <Pressable
              onPress={handleClose}
              className="absolute top-3 right-3 items-center justify-center"
              style={[
                {
                  width: overlayTheme.closeButton.size,
                  height: overlayTheme.closeButton.size,
                  borderRadius: overlayTheme.closeButton.borderRadius,
                  backgroundColor: overlayTheme.closeButton.backgroundColor,
                  zIndex: 10,
                },
              ]}
              hitSlop={12}
            >
              <X
                size={overlayTheme.closeButton.iconSize}
                color={overlayTheme.closeButton.iconColor}
              />
            </Pressable>
          )}

          {/* Header */}
          {(title || subtitle || icon) && (
            <View
              className="flex-row items-center"
              style={{
                marginBottom: overlayTheme.spacing.sectionGap,
                paddingRight: overlayTheme.closeButton.size + 8,
              }}
            >
              {icon && (
                <View
                  className="w-11 h-11 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                >
                  {icon}
                </View>
              )}
              <View className="flex-1">
                {title && (
                  <Heading
                    size="xl"
                    style={{ color: overlayTheme.typography.title.color, fontWeight: '700' }}
                  >
                    {title}
                  </Heading>
                )}
                {subtitle && (
                  <Text
                    className="mt-0.5"
                    style={{
                      color: overlayTheme.typography.subtitle.color,
                      fontSize: overlayTheme.typography.subtitle.fontSize,
                    }}
                  >
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Body */}
          <View style={{ marginTop: overlayTheme.spacing.headerGap }}>
            {children}
          </View>

          {/* Footer */}
          {footer && (
            <View
              className="flex-row justify-end"
              style={{
                marginTop: overlayTheme.spacing.sectionGap,
                gap: overlayTheme.spacing.actionGap,
              }}
            >
              {footer}
            </View>
          )}
        </Animated.View>
      </ContentWrapper>
    </View>
  );
}

export default OverlayModal;
