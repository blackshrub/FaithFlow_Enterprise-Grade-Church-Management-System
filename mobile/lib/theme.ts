import { COLORS, FONT_SIZES, SPACING } from "./constants";

/**
 * Theme configuration for FaithFlow mobile app
 *
 * Integrates with:
 * - NativeWind (Tailwind CSS classes)
 * - Gluestack UI
 * - Moti animations
 */

export const theme = {
  colors: {
    ...COLORS,
    // Extended color palette for Gluestack UI
    primary50: "#EDEFFD",
    primary100: "#DBE0FC",
    primary200: "#B7C1F9",
    primary300: "#93A2F6",
    primary400: "#6F83F3",
    primary500: "#6366F1",
    primary600: "#3B3FEF",
    primary700: "#1F23DF",
    primary800: "#1719B7",
    primary900: "#10118F",

    secondary50: "#FCE7F3",
    secondary100: "#FBCFE8",
    secondary200: "#F9A8D4",
    secondary300: "#F472B6",
    secondary400: "#EC4899",
    secondary500: "#DB2777",
    secondary600: "#BE185D",
    secondary700: "#9D174D",
    secondary800: "#831843",
    secondary900: "#500724",
  },

  fonts: {
    heading: "Poppins",
    body: "Inter",
    mono: "Courier",
  },

  fontSizes: FONT_SIZES,

  spacing: SPACING,

  // Border radius values
  borderRadius: {
    none: 0,
    sm: 4,
    base: 8,
    md: 12,
    lg: 16,
    xl: 20,
    "2xl": 24,
    full: 9999,
  },

  // Shadow configurations
  shadows: {
    sm: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
    xl: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  // Animation durations (milliseconds)
  durations: {
    fast: 200,
    normal: 300,
    slow: 500,
  },

  // Animation easing curves
  easing: {
    linear: "linear",
    ease: "ease",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
  },
} as const;

export type Theme = typeof theme;

export default theme;
