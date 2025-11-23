/**
 * Toast Provider
 *
 * Initializes the global toast instance
 * Must be mounted in the app root layout
 */

import React, { useEffect } from 'react';
import { useToast } from '@gluestack-ui/themed';
import { setToastInstance } from '@/components/ui/Toast';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const toast = useToast();

  useEffect(() => {
    setToastInstance(toast);
  }, [toast]);

  return <>{children}</>;
};
