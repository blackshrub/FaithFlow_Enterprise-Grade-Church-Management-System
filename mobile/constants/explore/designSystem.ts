/**
 * Explore Feature Design System
 *
 * Based on FaithFlow_Explore_UIUX_Design_Specification.md
 * "A sanctuary in your pocket" - Inspired by Headspace, Calm, Duolingo
 */

// ==================== COLOR PALETTE ====================

export const ExploreColors = {
  // Primary (Spiritual Purple)
  primary: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    200: '#DDD6FE',
    300: '#C4B5FD',
    400: '#A78BFA',
    500: '#8B5CF6', // Main brand color
    600: '#7C3AED',
    700: '#6D28D9',
    800: '#5B21B6',
    900: '#4C1D95',
  },

  // Secondary (Warm Gold)
  secondary: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // Accent for celebrations
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },

  // Spiritual (Heaven Blue)
  spiritual: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#5B9BD5', // Main spiritual blue
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Semantic Colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#10B981', // green-500
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
  },
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B', // amber-500
    600: '#D97706',
    700: '#B45309',
    800: '#92400E',
    900: '#78350F',
  },
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444', // red-500
    600: '#DC2626',
    700: '#B91C1C',
    800: '#991B1B',
    900: '#7F1D1D',
  },
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6', // blue-500
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Neutrals
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },

  // Background
  background: {
    light: '#FFFFFF',
    lightSecondary: '#F9FAFB', // neutral-50
    dark: '#111827', // neutral-900
    darkSecondary: '#1F2937', // neutral-800
  },

  // Text
  text: {
    light: {
      primary: '#111827', // neutral-900
      secondary: '#6B7280', // neutral-500
      tertiary: '#9CA3AF', // neutral-400
      inverse: '#FFFFFF',
    },
    dark: {
      primary: '#F9FAFB', // neutral-50
      secondary: '#D1D5DB', // neutral-300
      tertiary: '#9CA3AF', // neutral-400
      inverse: '#111827',
    },
  },
} as const;

// ==================== TYPOGRAPHY ====================

export const ExploreTypography = {
  // Font Families
  fontFamily: {
    primary: 'Inter', // UI text
    display: 'ClashDisplay', // Headlines (if available, fallback to Inter)
    mono: 'monospace', // Code/verse references
  },

  // Font Sizes (Mobile-first)
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
} as const;

// ==================== SPACING ====================

export const ExploreSpacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ==================== BORDER RADIUS ====================

export const ExploreBorderRadius = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

// ==================== SHADOWS ====================

export const ExploreShadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
} as const;

// ==================== ANIMATION ====================

export const ExploreAnimation = {
  // Durations (ms)
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },

  // Easing curves
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    spring: 'spring',
  },

  // Spring configs (for react-native-reanimated)
  spring: {
    gentle: {
      damping: 20,
      stiffness: 90,
      mass: 1,
    },
    normal: {
      damping: 15,
      stiffness: 120,
      mass: 1,
    },
    bouncy: {
      damping: 10,
      stiffness: 150,
      mass: 1,
    },
  },
} as const;

// ==================== LAYOUT ====================

export const ExploreLayout = {
  // Container padding
  containerPadding: 20,
  containerPaddingSmall: 16,

  // Card dimensions
  cardMinHeight: 120,
  cardMaxWidth: 400,

  // Header heights
  headerHeight: 56,
  headerHeightLarge: 64,

  // Bottom tab bar
  tabBarHeight: 80,

  // Content max width (for tablets)
  contentMaxWidth: 800,
} as const;

// ==================== CONTENT TYPES ====================

export const ExploreContentTypes = {
  // Daily time-sensitive content
  daily: {
    devotion: 'daily_devotion',
    verse: 'verse_of_the_day',
    figure: 'bible_figure_of_the_day',
    quiz: 'daily_quiz',
  },

  // Self-paced evergreen content
  evergreen: {
    studies: 'bible_studies',
    figures: 'bible_figures',
    topical: 'topical_verses',
    devotionPlans: 'devotion_plans',
    practiceQuiz: 'practice_quiz',
    knowledge: 'knowledge_resources',
    images: 'shareable_images',
  },
} as const;

// ==================== FEATURE FLAGS ====================

export const ExploreFeatureFlags = {
  // Daily content
  dailyDevotion: 'explore_daily_devotion',
  verseOfTheDay: 'explore_verse_of_the_day',
  bibleFigureOfTheDay: 'explore_bible_figure_of_the_day',
  dailyQuiz: 'explore_daily_quiz',

  // Self-paced content
  bibleStudies: 'explore_bible_studies',
  bibleFigures: 'explore_bible_figures',
  topicalVerses: 'explore_topical_verses',
  devotionPlans: 'explore_devotion_plans',
  practiceQuiz: 'explore_practice_quiz',
  knowledgeResources: 'explore_knowledge_resources',
  shareableImages: 'explore_shareable_images',

  // Features
  streakTracking: 'explore_streak_tracking',
  progressTracking: 'explore_progress_tracking',
  celebrations: 'explore_celebrations',
  offlineMode: 'explore_offline_mode',
} as const;

// ==================== ICONS ====================

export const ExploreIcons = {
  // Content types
  devotion: 'book-open',
  verse: 'scroll',
  figure: 'user',
  quiz: 'help-circle',
  study: 'book',
  topical: 'tag',
  plan: 'list',
  knowledge: 'lightbulb',
  image: 'image',

  // Actions
  read: 'eye',
  completed: 'check-circle',
  inProgress: 'clock',
  locked: 'lock',
  share: 'share-2',
  bookmark: 'bookmark',
  heart: 'heart',

  // Navigation
  home: 'home',
  search: 'search',
  filter: 'filter',
  settings: 'settings',
  back: 'arrow-left',
  forward: 'arrow-right',

  // Status
  streak: 'zap',
  trophy: 'award',
  star: 'star',
  fire: 'flame',
} as const;

// ==================== ACCESSIBILITY ====================

export const ExploreAccessibility = {
  // Minimum touch target size
  minTouchTarget: 44,

  // Color contrast ratios
  contrastRatio: {
    normal: 4.5, // WCAG AA
    large: 3, // WCAG AA for large text
    enhanced: 7, // WCAG AAA
  },

  // Screen reader labels
  labels: {
    readMore: 'Read more',
    readLess: 'Read less',
    close: 'Close',
    back: 'Go back',
    loading: 'Loading',
    error: 'Error',
    retry: 'Retry',
    completed: 'Completed',
    inProgress: 'In progress',
    notStarted: 'Not started',
  },
} as const;

// ==================== CONTENT LIMITS ====================

export const ExploreContentLimits = {
  // Text limits
  titleMaxLength: 100,
  summaryMaxLength: 200,
  descriptionMaxLength: 500,

  // Reading time estimates (words per minute)
  readingSpeed: {
    slow: 150,
    normal: 200,
    fast: 250,
  },

  // Pagination
  itemsPerPage: 20,
  preloadThreshold: 5,
} as const;

// ==================== Z-INDEX LAYERS ====================

export const ExploreZIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  toast: 600,
  tooltip: 700,
} as const;
