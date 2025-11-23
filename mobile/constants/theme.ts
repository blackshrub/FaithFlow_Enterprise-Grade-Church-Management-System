/**
 * FaithFlow Mobile Design System
 *
 * Universal theme designed for all ages (teenagers to elderly)
 * - High contrast for readability
 * - Larger touch targets (min 44x44)
 * - Clear typography hierarchy
 * - Calming, trustworthy colors
 */

export const colors = {
  // Primary - Deep Blue (Trust, Faith, Stability)
  primary: {
    50: '#e6f0ff',
    100: '#b3d1ff',
    200: '#80b3ff',
    300: '#4d94ff',
    400: '#1a75ff',
    500: '#0066ff', // Main brand color
    600: '#0052cc',
    700: '#003d99',
    800: '#002966',
    900: '#001433',
  },

  // Secondary - Warm Orange (Warmth, Community, Energy)
  secondary: {
    50: '#fff3e6',
    100: '#ffd9b3',
    200: '#ffbf80',
    300: '#ffa64d',
    400: '#ff8c1a',
    500: '#ff7300', // Accent color
    600: '#cc5c00',
    700: '#994500',
    800: '#662e00',
    900: '#331700',
  },

  // Success - Green (Growth, Life, Hope)
  success: {
    50: '#e6f7ed',
    100: '#b3e7cc',
    200: '#80d7ab',
    300: '#4dc78a',
    400: '#1ab769',
    500: '#00a651',
    600: '#008541',
    700: '#006431',
    800: '#004321',
    900: '#002110',
  },

  // Warning - Amber (Attention, Important)
  warning: {
    50: '#fff8e6',
    100: '#ffe9b3',
    200: '#ffda80',
    300: '#ffcb4d',
    400: '#ffbc1a',
    500: '#ffad00',
    600: '#cc8a00',
    700: '#996800',
    800: '#664500',
    900: '#332300',
  },

  // Error - Red (Alert, Error, Stop)
  error: {
    50: '#ffe6e6',
    100: '#ffb3b3',
    200: '#ff8080',
    300: '#ff4d4d',
    400: '#ff1a1a',
    500: '#e60000',
    600: '#b80000',
    700: '#8a0000',
    800: '#5c0000',
    900: '#2e0000',
  },

  // Neutrals - Warm Gray (Professional, Clean)
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },

  // Semantic colors
  background: {
    light: '#ffffff',
    dark: '#0f172a',
  },
  text: {
    primary: '#111827',
    secondary: '#6b7280',
    tertiary: '#9ca3af',
    inverse: '#ffffff',
  },
};

export const typography = {
  // Font families
  fonts: {
    body: 'System', // Use native system font for best readability
    heading: 'System',
    mono: 'Courier',
  },

  // Font sizes (larger for better readability)
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,   // Base size
    lg: 18,   // Comfortable reading
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Line heights (generous for readability)
  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Font weights
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Animation presets
export const animations = {
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Touch target sizes (WCAG AAA)
export const touchTargets = {
  minimum: 44, // iOS/Android minimum
  comfortable: 56, // Material Design recommended
  large: 64, // For primary actions
};

// Icon sizes
export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
};

// Bible Reading Themes (YouVersion-inspired)
export const readingThemes = {
  light: {
    background: '#ffffff',
    text: '#111827',
    verseNumber: '#6b7280',
    highlight: {
      yellow: '#fef3c7',
      green: '#d1fae5',
      blue: '#dbeafe',
      pink: '#fce7f3',
      orange: '#fed7aa',
    },
  },
  dark: {
    background: '#1f2937',
    text: '#f9fafb',
    verseNumber: '#9ca3af',
    highlight: {
      yellow: '#78350f',
      green: '#064e3b',
      blue: '#1e3a8a',
      pink: '#831843',
      orange: '#7c2d12',
    },
  },
  sepia: {
    background: '#f5f1e8',
    text: '#3e3830',
    verseNumber: '#78716c',
    highlight: {
      yellow: '#fef08a',
      green: '#bbf7d0',
      blue: '#bfdbfe',
      pink: '#fbcfe8',
      orange: '#fed7aa',
    },
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  touchTargets,
  iconSizes,
  readingThemes,
};
