/**
 * Toast Notification System
 *
 * Global toast notifications using react-native-toast-message
 * Simple, reliable, and works out of the box
 *
 * Usage:
 * import { showToast } from '@/components/ui/Toast';
 * showToast('success', 'Title', 'Description');
 */

import Toast from 'react-native-toast-message';
import * as Haptics from 'expo-haptics';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Show a toast notification
 */
export const showToast = (
  type: ToastType,
  title: string,
  description?: string,
  duration: number = 3000
) => {
  console.log('🍞 showToast called:', { type, title, description });

  // Haptic feedback based on type
  switch (type) {
    case 'success':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      break;
    case 'error':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      break;
    case 'warning':
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      break;
    case 'info':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      break;
  }

  Toast.show({
    type,
    text1: title,
    text2: description,
    position: 'bottom',
    visibilityTime: duration,
    bottomOffset: 180, // Above verse selection bar + tab bar
  });

  console.log('✅ Toast displayed');
};

/**
 * Convenience functions
 */
export const showSuccessToast = (title: string, description?: string) => {
  showToast('success', title, description);
};

export const showErrorToast = (title: string, description?: string) => {
  showToast('error', title, description);
};

export const showWarningToast = (title: string, description?: string) => {
  showToast('warning', title, description);
};

export const showInfoToast = (title: string, description?: string) => {
  showToast('info', title, description);
};
