/**
 * OverlayBottomSheet - V5 Design System
 *
 * Generic bottom sheet shell with unified design tokens.
 * Wraps @gorhom/bottom-sheet with consistent styling.
 *
 * Features:
 * - Unified handle indicator style
 * - Consistent rounded corners
 * - Standard padding
 * - Backdrop configuration
 * - Gesture tuning from interaction config
 *
 * Styling: Inline styles required for gorhom/bottom-sheet styling props
 */

import React, { useCallback, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { View, ViewStyle } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetScrollView,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';

import { overlayTheme } from '@/theme/overlayTheme';
import { interaction } from '@/constants/interaction';

// ==========================================================================
// TYPES
// ==========================================================================

export interface OverlayBottomSheetProps {
  /** Whether the sheet is visible (index-based control) */
  visible: boolean;
  /** Callback when sheet is dismissed */
  onDismiss: () => void;
  /** Snap points array (e.g., ['50%', '90%']) */
  snapPoints?: (string | number)[];
  /** Sheet content */
  children: React.ReactNode;
  /** Whether content is scrollable (default: false) */
  scrollable?: boolean;
  /** Enable pan down to close (default: true) */
  enablePanDownToClose?: boolean;
  /** Enable dynamic sizing (default: false) */
  enableDynamicSizing?: boolean;
  /** Custom handle component */
  handleComponent?: React.FC;
  /** Whether to show backdrop (default: true) */
  showBackdrop?: boolean;
  /** Backdrop opacity (default: 0.5) */
  backdropOpacity?: number;
  /** Backdrop press behavior (default: 'close') */
  backdropPressBehavior?: 'none' | 'close' | 'collapse';
}

export interface OverlayBottomSheetRef {
  expand: () => void;
  collapse: () => void;
  close: () => void;
  snapToIndex: (index: number) => void;
}

// ==========================================================================
// COMPONENT
// ==========================================================================

export const OverlayBottomSheet = forwardRef<
  OverlayBottomSheetRef,
  OverlayBottomSheetProps
>(function OverlayBottomSheet(
  {
    visible,
    onDismiss,
    snapPoints: customSnapPoints,
    children,
    scrollable = false,
    enablePanDownToClose = true,
    enableDynamicSizing = false,
    handleComponent,
    showBackdrop = true,
    backdropOpacity = 0.5,
    backdropPressBehavior = 'close',
  },
  ref
) {
  const bottomSheetRef = useRef<BottomSheet>(null);

  // Default snap points
  const snapPoints = useMemo(
    () => customSnapPoints ?? ['50%'],
    [customSnapPoints]
  );

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    expand: () => bottomSheetRef.current?.expand(),
    collapse: () => bottomSheetRef.current?.collapse(),
    close: () => bottomSheetRef.current?.close(),
    snapToIndex: (index: number) => bottomSheetRef.current?.snapToIndex(index),
  }));

  // Render backdrop
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) =>
      showBackdrop ? (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={backdropOpacity}
          pressBehavior={backdropPressBehavior}
        />
      ) : null,
    [showBackdrop, backdropOpacity, backdropPressBehavior]
  );

  // Handle dismiss
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // Content wrapper component
  const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

  // Inline styles for gorhom/bottom-sheet styling props
  const backgroundStyle: ViewStyle = {
    backgroundColor: overlayTheme.sheet.backgroundColor,
    borderTopLeftRadius: overlayTheme.sheet.borderRadiusTop,
    borderTopRightRadius: overlayTheme.sheet.borderRadiusTop,
  };

  const handleIndicatorStyle: ViewStyle = {
    backgroundColor: overlayTheme.sheet.handleColor,
    width: overlayTheme.sheet.handleWidth,
    height: overlayTheme.sheet.handleHeight,
    borderRadius: overlayTheme.sheet.handleHeight / 2,
  };

  const contentStyle: ViewStyle = {
    paddingHorizontal: overlayTheme.sheet.paddingHorizontal,
    paddingTop: overlayTheme.sheet.paddingTop,
    paddingBottom: overlayTheme.sheet.paddingBottom,
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose={enablePanDownToClose}
      enableDynamicSizing={enableDynamicSizing}
      onClose={handleDismiss}
      backdropComponent={renderBackdrop}
      handleComponent={handleComponent}
      backgroundStyle={backgroundStyle}
      handleIndicatorStyle={handleIndicatorStyle}
      // Gesture tuning from interaction config
      activeOffsetY={interaction.gestures.activeOffset as [number, number]}
      failOffsetY={interaction.gestures.failOffset as [number, number]}
      // Performance optimizations
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
      animateOnMount={true}
    >
      <ContentWrapper style={contentStyle}>
        {children}
      </ContentWrapper>
    </BottomSheet>
  );
});

export default OverlayBottomSheet;
