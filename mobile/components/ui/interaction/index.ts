/**
 * V6 Interaction Components - Unified Micro-Interactions
 *
 * This module exports all enhanced UI components with unified:
 * - Haptic feedback
 * - Press animations (scale/opacity)
 * - Focus state animations
 * - Gesture tuning
 *
 * Usage:
 * import { AnimatedPressable, EnhancedButton, FocusableInput } from '@/components/ui/interaction';
 */

// ==========================================================================
// PRESSABLE COMPONENTS
// ==========================================================================

export {
  AnimatedPressable,
  AnimatedButton,
  AnimatedCard,
  AnimatedIconButton,
  AnimatedListItem,
  type AnimatedPressableProps,
  type HapticType,
} from '../AnimatedPressable';

// ==========================================================================
// BUTTON COMPONENTS
// ==========================================================================

export {
  EnhancedButton,
  PrimaryButton,
  SecondaryButton,
  DestructiveButton,
  SuccessButton,
  GhostButton,
  // Re-exported subcomponents
  ButtonText,
  ButtonIcon,
  ButtonSpinner,
} from '../EnhancedButton';

// ==========================================================================
// INPUT COMPONENTS
// ==========================================================================

export {
  FocusableInput,
  SearchInput,
  FormInput,
  UnderlinedInput,
  type FocusableInputProps,
} from '../FocusableInput';

// ==========================================================================
// CONSTANTS
// ==========================================================================

export { interaction, haptics } from '@/constants/interaction';
