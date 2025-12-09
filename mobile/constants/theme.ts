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

  // Info - Blue (Information, Help, Neutral alerts)
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Pink - Soft Pink (Feminine, Prayer, Care)
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
  },

  // Purple - Spiritual Purple (Prayer, Spirituality)
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },

  // Blue - Standard Blue (Info, Links, Actions)
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Amber - Warm Amber (Alerts, Highlights)
  amber: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
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

  // Common colors
  white: '#ffffff',
  black: '#000000',

  // Premium color palette (for special screens like login, AI features)
  premium: {
    // Indigo/Violet gradient (login, auth screens)
    gradient: {
      start: '#4338CA',   // indigo-700
      mid: '#6366F1',     // indigo-500
      end: '#8B5CF6',     // violet-500
    },
    // Accent colors
    accent: {
      primary: '#A78BFA', // violet-400
      light: '#C4B5FD',   // violet-300
    },
    // Glass effects
    glass: {
      white: 'rgba(255, 255, 255, 0.15)',
      border: 'rgba(255, 255, 255, 0.25)',
    },
    // Text on gradient
    text: {
      primary: '#FFFFFF',
      muted: 'rgba(255, 255, 255, 0.8)',
    },
    // AI companion gradient
    ai: {
      gradient: ['#4F46E5', '#7C3AED', '#A855F7'] as const,
      gradientWarm: ['#7C3AED', '#9333EA', '#A855F7'] as const,
      shadow: '#4F46E5',
    },
    // Gold accent (giving, premium features)
    gold: {
      primary: '#D4AF37',
      light: '#F4E5BC',
      dark: '#B8962E',
    },
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

/**
 * Community/Chat Colors (WhatsApp-inspired)
 *
 * Centralized color palette for all community and chat screens.
 * Maintains familiar messaging UX while staying consistent.
 */
export const communityColors = {
  // Primary brand (WhatsApp-inspired teal)
  primary: {
    50: '#E7F5F3',
    100: '#C5E8E3',
    200: '#9DD9D0',
    300: '#6EC7BA',
    400: '#3DB5A5',
    500: '#128C7E', // Main brand color
    600: '#0E7168',
    700: '#0A5651',
    800: '#073C39',
    900: '#042321',
  },
  // Accent green (for active states, badges, online indicators)
  accent: '#25D366',
  // Dark teal (for headers, primary actions, FAB)
  dark: '#075E54',
  // Light teal for hover/pressed states
  light: '#128C7E',

  // Message bubbles
  bubble: {
    outgoing: '#DCF8C6', // Light green for sent messages
    incoming: '#FFFFFF', // White for received
    system: '#FFF3CD', // Yellow for system messages
  },

  // Status indicators
  status: {
    online: '#25D366',
    typing: '#25D366',
    read: '#53BDEB', // Blue double-check
    delivered: '#8696A0',
    sent: '#8696A0',
  },

  // Semantic colors for community context
  unreadBadge: '#25D366',
  mentionBadge: '#1B8755',

  // Backgrounds
  background: {
    chat: '#F5F2EC', // Beige chat background
    header: '#FFFFFF', // Standard white header
    surface: '#F7F7F7', // Elevated surface / cards
    input: '#FFFFFF', // Input field background
    pressed: '#F2F3F5', // Pressed state
  },

  // Text in community context
  text: {
    primary: '#1A1A1A',
    secondary: '#667781',
    tertiary: '#8696A0',
    onPrimary: '#FFFFFF',
    senderName: '#06CF9C',
    link: '#53BDEB',
  },

  // Borders and dividers
  border: '#E8E8E8',
  divider: '#EBEBEB',
  inputBorder: '#E4E6EB',
  inputBorderFocused: '#25D366',

  // Interactive states
  pressed: '#F2F3F5',
  ripple: 'rgba(0, 0, 0, 0.08)',

  // Category badge colors
  category: {
    general: '#075E54',
    ministry: '#6366F1',
    activity: '#22C55E',
    support: '#F59E0B',
    announcement: '#EF4444',
  },

  // Doodle pattern for chat background
  doodle: '#D5D0C8',
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
  '3xl': 32,
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

// Bible Reading Themes (YouVersion-inspired) - 7 Themes Total
export const readingThemes = {
  // Light Themes (4)
  light: {
    name: 'White',
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
  light2: {
    name: 'Cream',
    background: '#faf8f3',
    text: '#1c1917',
    verseNumber: '#78716c',
    highlight: {
      yellow: '#fef3c7',
      green: '#d1fae5',
      blue: '#dbeafe',
      pink: '#fce7f3',
      orange: '#fed7aa',
    },
  },
  light3: {
    name: 'Soft Blue',
    background: '#f0f9ff',
    text: '#0c4a6e',
    verseNumber: '#64748b',
    highlight: {
      yellow: '#fef08a',
      green: '#bbf7d0',
      blue: '#bfdbfe',
      pink: '#fbcfe8',
      orange: '#fcd34d',
    },
  },
  sepia: {
    name: 'Sepia',
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
  // Light Variant 4
  light4: {
    name: 'Warm Beige',
    background: '#fef7ed',
    text: '#431407',
    verseNumber: '#92400e',
    highlight: {
      yellow: '#fef3c7',
      green: '#d1fae5',
      blue: '#dbeafe',
      pink: '#fce7f3',
      orange: '#fed7aa',
    },
  },

  // Dark Themes (3)
  dark: {
    name: 'Dark Gray',
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
  dark2: {
    name: 'True Black',
    background: '#0a0a0a',
    text: '#e5e5e5',
    verseNumber: '#a3a3a3',
    highlight: {
      yellow: '#713f12',
      green: '#065f46',
      blue: '#1e40af',
      pink: '#9f1239',
      orange: '#9a3412',
    },
  },
  dark3: {
    name: 'Navy Blue',
    background: '#0f172a',
    text: '#f1f5f9',
    verseNumber: '#94a3b8',
    highlight: {
      yellow: '#713f12',
      green: '#064e3b',
      blue: '#1e3a8a',
      pink: '#831843',
      orange: '#7c2d12',
    },
  },
};

export default {
  colors,
  communityColors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animations,
  touchTargets,
  iconSizes,
  readingThemes,
};
