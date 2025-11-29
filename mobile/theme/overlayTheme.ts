/**
 * Overlay Theme - V5 Design System
 *
 * Unified design tokens for ALL overlays (modals + bottom sheets)
 * Creates a cohesive premium overlay system across the app.
 *
 * Used by:
 * - OverlayModal (centered dialogs)
 * - OverlayBottomSheet (gorhom sheets)
 * - UnifiedOverlayHost (central renderer)
 */

import { Platform } from 'react-native';

export const overlayTheme = {
  // ==========================================================================
  // SCRIM (Background dim)
  // ==========================================================================
  scrim: {
    color: 'rgba(0, 0, 0, 0.45)',
    blurIntensity: 20,
  },

  // ==========================================================================
  // MODAL (Centered dialogs)
  // ==========================================================================
  modal: {
    backgroundColor: '#FFFFFF',
    darkBackgroundColor: '#0b0b10',
    maxWidth: 480,
    padding: 20,
    borderRadius: 24,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    darkBorderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    shadow: {
      color: '#000',
      opacity: 0.15,
      radius: 24,
      offset: { width: 0, height: 12 },
    },
    darkShadow: {
      color: '#000',
      opacity: 0.4,
      radius: 24,
      offset: { width: 0, height: 12 },
    },
  },

  // ==========================================================================
  // SHEET (Bottom sheets)
  // ==========================================================================
  sheet: {
    backgroundColor: '#FFFFFF',
    darkBackgroundColor: '#050509',
    handleColor: 'rgba(0, 0, 0, 0.2)',
    darkHandleColor: 'rgba(255, 255, 255, 0.2)',
    handleWidth: 40,
    handleHeight: 4,
    borderRadiusTop: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },

  // ==========================================================================
  // TYPOGRAPHY
  // ==========================================================================
  typography: {
    title: {
      fontSize: 20,
      fontWeight: '700' as const,
      letterSpacing: -0.3,
      color: '#111827', // gray-900
      darkColor: '#F9FAFB',
    },
    subtitle: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: '#6B7280', // gray-500
      darkColor: 'rgba(249, 250, 251, 0.7)',
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      color: '#374151', // gray-700
      darkColor: 'rgba(229, 231, 235, 0.95)',
      lineHeight: 20,
    },
    label: {
      fontSize: 12,
      fontWeight: '600' as const,
      color: '#9CA3AF', // gray-400
      darkColor: 'rgba(156, 163, 175, 0.9)',
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
  },

  // ==========================================================================
  // SPACING
  // ==========================================================================
  spacing: {
    headerGap: 8,
    sectionGap: 16,
    actionGap: 10,
    contentGap: 12,
  },

  // ==========================================================================
  // ACCENT COLORS
  // ==========================================================================
  accent: {
    primary: '#3B82F6', // blue-500
    secondary: '#d4af37', // gold
    danger: '#EF4444', // red-500
    success: '#22C55E', // green-500
    warning: '#F59E0B', // amber-500
  },

  // ==========================================================================
  // BUTTONS
  // ==========================================================================
  button: {
    primary: {
      backgroundColor: '#3B82F6',
      textColor: '#FFFFFF',
      pressedOpacity: 0.85,
    },
    secondary: {
      backgroundColor: '#F3F4F6', // gray-100
      darkBackgroundColor: '#1F2937', // gray-800
      textColor: '#374151', // gray-700
      darkTextColor: '#F9FAFB',
      pressedOpacity: 0.7,
    },
    danger: {
      backgroundColor: '#EF4444',
      textColor: '#FFFFFF',
      pressedOpacity: 0.85,
    },
    ghost: {
      backgroundColor: 'transparent',
      textColor: '#6B7280',
      darkTextColor: '#9CA3AF',
      pressedOpacity: 0.5,
    },
  },

  // ==========================================================================
  // CLOSE BUTTON
  // ==========================================================================
  closeButton: {
    size: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6', // gray-100
    darkBackgroundColor: 'rgba(31, 41, 55, 0.7)',
    iconColor: '#6B7280', // gray-500
    darkIconColor: 'rgba(249, 250, 251, 0.7)',
    iconSize: 18,
  },

  // ==========================================================================
  // ANIMATION
  // ==========================================================================
  animation: {
    enter: {
      duration: 260,
      translateY: 40,
      scale: 0.96,
    },
    exit: {
      duration: 220,
    },
    backdrop: {
      fadeDuration: 200,
    },
  },
} as const;

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

/**
 * Get modal styles based on color scheme
 */
export function getModalStyles(isDark: boolean) {
  return {
    backgroundColor: isDark
      ? overlayTheme.modal.darkBackgroundColor
      : overlayTheme.modal.backgroundColor,
    borderColor: isDark
      ? overlayTheme.modal.darkBorderColor
      : overlayTheme.modal.borderColor,
    shadow: isDark ? overlayTheme.modal.darkShadow : overlayTheme.modal.shadow,
  };
}

/**
 * Get sheet styles based on color scheme
 */
export function getSheetStyles(isDark: boolean) {
  return {
    backgroundColor: isDark
      ? overlayTheme.sheet.darkBackgroundColor
      : overlayTheme.sheet.backgroundColor,
    handleColor: isDark
      ? overlayTheme.sheet.darkHandleColor
      : overlayTheme.sheet.handleColor,
  };
}

/**
 * Get typography styles based on color scheme
 */
export function getTypographyColor(
  type: 'title' | 'subtitle' | 'body' | 'label',
  isDark: boolean
) {
  const typo = overlayTheme.typography[type];
  return isDark ? typo.darkColor : typo.color;
}

export default overlayTheme;
