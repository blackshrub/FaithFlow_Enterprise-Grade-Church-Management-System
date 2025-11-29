/**
 * Higher-Order Components (HOCs) for FaithFlow Mobile
 *
 * V10 Ultra Pack - Production-Grade Motion System
 * All previous versions (V6, V8, V9) have been consolidated into V10
 */

export {
  withPremiumMotionV10,
  withPremiumMotionV10FadeThrough,
  withPremiumMotionV10SharedAxisX,
  withPremiumMotionV10SharedAxisY,
  withPremiumMotionV10SlideLift,
  withPremiumMotionV10Instant,
  withPremiumMotionV10Modal,
  resetPerformanceDetection,
  setLowPerformanceMode,
  isLowPerformanceMode,
  GLOBAL_MOTION_DELAY,
} from './withPremiumMotionV10';

// Re-export motion delay helpers for convenience
export { getGlobalMotionDelay, setGlobalMotionDelay } from '@/components/motion/premium-motion';

export type { PremiumMotionV10Options, V10AnimationType } from './withPremiumMotionV10';

// Default export for convenience
export { withPremiumMotionV10 as default } from './withPremiumMotionV10';
