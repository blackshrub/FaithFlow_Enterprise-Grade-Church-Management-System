/**
 * Toast Notification System
 *
 * Global toast notifications to replace Alert.alert
 * Uses Gluestack UI Toast component with custom styling
 *
 * Usage:
 * import { showToast } from '@/components/ui/Toast';
 * showToast('success', 'Title', 'Description');
 */

import React from 'react';
import {
  Toast,
  ToastTitle,
  ToastDescription,
  VStack,
  Icon,
  useToast,
} from '@gluestack-ui/themed';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

// Global toast instance (will be set by ToastProvider)
let toastInstance: ReturnType<typeof useToast> | null = null;

export const setToastInstance = (instance: ReturnType<typeof useToast>) => {
  toastInstance = instance;
};

/**
 * Show a toast notification
 */
export const showToast = (
  type: ToastType,
  title: string,
  description?: string,
  duration: number = 3000
) => {
  if (!toastInstance) {
    console.warn('Toast instance not initialized. Make sure ToastProvider is mounted.');
    return;
  }

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

  // Get icon and colors based on type
  const getToastConfig = (toastType: ToastType) => {
    switch (toastType) {
      case 'success':
        return {
          icon: CheckCircle,
          bgColor: colors.success[50],
          iconColor: colors.success[600],
          titleColor: colors.success[900],
          borderColor: colors.success[200],
        };
      case 'error':
        return {
          icon: XCircle,
          bgColor: colors.error[50],
          iconColor: colors.error[600],
          titleColor: colors.error[900],
          borderColor: colors.error[200],
        };
      case 'warning':
        return {
          icon: AlertCircle,
          bgColor: colors.warning[50],
          iconColor: colors.warning[600],
          titleColor: colors.warning[900],
          borderColor: colors.warning[200],
        };
      case 'info':
        return {
          icon: Info,
          bgColor: colors.primary[50],
          iconColor: colors.primary[600],
          titleColor: colors.primary[900],
          borderColor: colors.primary[200],
        };
    }
  };

  const config = getToastConfig(type);

  toastInstance.show({
    placement: 'top',
    duration,
    render: ({ id }) => {
      return (
        <Toast
          nativeID={`toast-${id}`}
          action={type}
          variant="solid"
          style={{
            backgroundColor: config.bgColor,
            borderLeftWidth: 4,
            borderLeftColor: config.borderColor,
            borderRadius: 12,
            padding: 16,
            marginTop: 60, // Below status bar
            marginHorizontal: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 5,
          }}
        >
          <VStack space="xs" style={{ flex: 1 }}>
            <ToastTitle
              style={{
                color: config.titleColor,
                fontSize: 16,
                fontWeight: '600',
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Icon
                as={config.icon}
                size="sm"
                style={{ color: config.iconColor, marginRight: 8 }}
              />
              {title}
            </ToastTitle>
            {description && (
              <ToastDescription
                style={{
                  color: config.titleColor,
                  fontSize: 14,
                  opacity: 0.8,
                  marginLeft: 28, // Align with title text after icon
                }}
              >
                {description}
              </ToastDescription>
            )}
          </VStack>
        </Toast>
      );
    },
  });
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
