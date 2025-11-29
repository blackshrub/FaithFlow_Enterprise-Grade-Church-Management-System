/**
 * Animation Hooks Index
 *
 * Centralized exports for all animation hooks.
 */

export { useHeaderAnimation } from './useHeaderAnimation';
export type { HeaderAnimationConfig } from './useHeaderAnimation';

export { useTabTransition, useTabTransitionState } from './useTabTransition';
export type { TabDirection, UseTabTransitionOptions } from './useTabTransition';

export {
  usePressAnimation,
  useSelectionAnimation,
  useFocusAnimation,
  useExpandAnimation,
  useShakeAnimation,
  usePulseAnimation,
} from './useMicroMotion';

export type {
  UsePressAnimationOptions,
  UseSelectionAnimationOptions,
  UseFocusAnimationOptions,
  UseExpandAnimationOptions,
} from './useMicroMotion';
