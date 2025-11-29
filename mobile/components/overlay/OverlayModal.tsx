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
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
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
  runOnJS,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { overlayTheme } from '@/theme/overlayTheme';
import { interaction } from '@/constants/interaction';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
        style: styles.contentWrapper,
      }
    : { style: styles.contentWrapper };

  return (
    <View style={styles.overlay} pointerEvents={visible ? 'auto' : 'none'}>
      {/* Backdrop with blur */}
      <Animated.View style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
        <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
          <BlurView
            intensity={overlayTheme.scrim.blurIntensity}
            style={styles.blur}
            tint="dark"
          />
          <View style={[styles.dim, { backgroundColor: overlayTheme.scrim.color }]} />
        </Pressable>
      </Animated.View>

      {/* Modal card */}
      <ContentWrapper {...wrapperProps}>
        <Animated.View
          style={[
            styles.card,
            { maxWidth },
            cardAnimatedStyle,
          ]}
        >
          {/* Close button */}
          {showCloseButton && (
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.closeButtonPressed,
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
            <View style={styles.header}>
              {icon && <View style={styles.iconWrap}>{icon}</View>}
              <View style={styles.headerText}>
                {title && (
                  <Heading size="xl" style={styles.title}>
                    {title}
                  </Heading>
                )}
                {subtitle && (
                  <Text style={styles.subtitle}>{subtitle}</Text>
                )}
              </View>
            </View>
          )}

          {/* Body */}
          <View style={styles.body}>{children}</View>

          {/* Footer */}
          {footer && <View style={styles.footer}>{footer}</View>}
        </Animated.View>
      </ContentWrapper>
    </View>
  );
}

// ==========================================================================
// STYLES
// ==========================================================================

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  blur: {
    ...StyleSheet.absoluteFillObject,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT - 100,
    backgroundColor: overlayTheme.modal.backgroundColor,
    borderRadius: overlayTheme.modal.borderRadius,
    borderWidth: overlayTheme.modal.borderWidth,
    borderColor: overlayTheme.modal.borderColor,
    padding: overlayTheme.modal.padding,
    shadowColor: overlayTheme.modal.shadow.color,
    shadowOpacity: overlayTheme.modal.shadow.opacity,
    shadowRadius: overlayTheme.modal.shadow.radius,
    shadowOffset: overlayTheme.modal.shadow.offset,
    elevation: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: overlayTheme.closeButton.size,
    height: overlayTheme.closeButton.size,
    borderRadius: overlayTheme.closeButton.borderRadius,
    backgroundColor: overlayTheme.closeButton.backgroundColor,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeButtonPressed: {
    opacity: interaction.press.opacity,
    transform: [{ scale: interaction.press.scale }],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: overlayTheme.spacing.sectionGap,
    paddingRight: overlayTheme.closeButton.size + 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)', // blue-500 with opacity
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: overlayTheme.typography.title.color,
    fontWeight: '700',
  },
  subtitle: {
    color: overlayTheme.typography.subtitle.color,
    fontSize: overlayTheme.typography.subtitle.fontSize,
    marginTop: 2,
  },
  body: {
    marginTop: overlayTheme.spacing.headerGap,
  },
  footer: {
    marginTop: overlayTheme.spacing.sectionGap,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: overlayTheme.spacing.actionGap,
  },
});

export default OverlayModal;
