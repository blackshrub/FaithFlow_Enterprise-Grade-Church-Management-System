/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and displays a fallback UI.
 * Reports crashes to the backend for monitoring.
 *
 * Features:
 * - Global and screen-level error catching
 * - Crash reporting to backend
 * - Offline crash queuing
 * - User-friendly recovery UI
 * - Bilingual support (EN/ID)
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Pressable,
  Platform,
  Dimensions,
  NativeModules,
} from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Button, ButtonText } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home, WifiOff } from 'lucide-react-native';
import { router } from 'expo-router';
import NetInfo from '@react-native-community/netinfo';
import * as Application from 'expo-application';
import { mmkv } from '@/lib/storage';
import i18n from '@/i18n';

// Primary color for icons (NativeWind classes used for backgrounds/text)
const PRIMARY_COLOR = '#3B82F6';

// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.faithflow.app';
const CRASH_LOG_ENDPOINT = `${API_BASE_URL}/api/crash-logs`;

// Offline queue storage key
const CRASH_QUEUE_KEY = 'faithflow_crash_queue';

// Get device info
const getDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  const isTablet = Math.min(width, height) >= 600;

  return {
    platform: Platform.OS as 'ios' | 'android' | 'web',
    os_version: Platform.Version?.toString() || 'unknown',
    device_model: Platform.OS === 'ios'
      ? NativeModules.PlatformConstants?.interfaceIdiom || 'iPhone'
      : NativeModules.PlatformConstants?.Model || 'Android',
    app_version: Application.nativeApplicationVersion || '1.0.0',
    build_number: Application.nativeBuildVersion || '1',
    locale: i18n.language || 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    is_tablet: isTablet,
  };
};

// Get user context from MMKV
const getUserContext = () => {
  try {
    const authData = mmkv.getString('auth_member');
    if (authData) {
      const member = JSON.parse(authData);
      return {
        member_id: member.id,
        church_id: member.church_id,
        is_authenticated: true,
      };
    }
  } catch (e) {
    // Ignore parse errors
  }
  return {
    member_id: null,
    church_id: null,
    is_authenticated: false,
  };
};

interface CrashReport {
  error_type: string;
  error_message: string;
  stack_trace?: string;
  screen_name?: string;
  component_name?: string;
  device_info: ReturnType<typeof getDeviceInfo>;
  user_context: ReturnType<typeof getUserContext>;
  is_online: boolean;
  network_type?: string;
  breadcrumbs?: string[];
  extra_data?: Record<string, any>;
}

/**
 * Report crash to backend
 */
async function reportCrash(report: CrashReport): Promise<boolean> {
  try {
    const response = await fetch(CRASH_LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    return response.ok;
  } catch (e) {
    console.error('[ErrorBoundary] Failed to report crash:', e);
    return false;
  }
}

/**
 * Queue crash for later submission (offline)
 */
function queueCrash(report: CrashReport) {
  try {
    const existingQueue = mmkv.getString(CRASH_QUEUE_KEY);
    const queue: CrashReport[] = existingQueue ? JSON.parse(existingQueue) : [];
    queue.push(report);
    // Keep max 10 queued crashes
    const trimmedQueue = queue.slice(-10);
    mmkv.setString(CRASH_QUEUE_KEY, JSON.stringify(trimmedQueue));
  } catch (e) {
    console.error('[ErrorBoundary] Failed to queue crash:', e);
  }
}

/**
 * Flush queued crashes when online
 */
export async function flushCrashQueue() {
  try {
    const queueStr = mmkv.getString(CRASH_QUEUE_KEY);
    if (!queueStr) return;

    const queue: CrashReport[] = JSON.parse(queueStr);
    if (queue.length === 0) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    // Submit all queued crashes
    const results = await Promise.all(queue.map(reportCrash));
    const successCount = results.filter(Boolean).length;

    if (successCount === queue.length) {
      // All submitted, clear queue
      mmkv.remove(CRASH_QUEUE_KEY);
    } else {
      // Keep failed ones
      const remaining = queue.filter((_, i) => !results[i]);
      mmkv.setString(CRASH_QUEUE_KEY, JSON.stringify(remaining));
    }

    console.log(`[ErrorBoundary] Flushed ${successCount}/${queue.length} queued crashes`);
  } catch (e) {
    console.error('[ErrorBoundary] Failed to flush crash queue:', e);
  }
}

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Screen name for context */
  screenName?: string;
  /** Whether this is the global boundary */
  isGlobal?: boolean;
  /** Custom fallback component */
  fallback?: ReactNode;
  /** Callback on error */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  isOnline: boolean;
  reportSent: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      isOnline: true,
      reportSent: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { screenName, isGlobal, onError } = this.props;

    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);

    // Check network status
    const netInfo = await NetInfo.fetch();
    const isOnline = netInfo.isConnected ?? true;

    this.setState({ isOnline });

    // Build crash report
    const report: CrashReport = {
      error_type: error.name || 'Error',
      error_message: error.message || 'Unknown error',
      stack_trace: error.stack,
      screen_name: screenName || (isGlobal ? 'global' : 'unknown'),
      component_name: this.extractComponentName(errorInfo.componentStack ?? undefined),
      device_info: getDeviceInfo(),
      user_context: getUserContext(),
      is_online: isOnline,
      network_type: netInfo.type,
      extra_data: {
        isGlobal,
        reactComponentStack: errorInfo.componentStack,
      },
    };

    // Report or queue
    if (isOnline) {
      const success = await reportCrash(report);
      this.setState({ reportSent: success });
    } else {
      queueCrash(report);
    }

    // Call custom handler
    onError?.(error, errorInfo);
  }

  /**
   * Extract component name from React's component stack
   */
  private extractComponentName(componentStack?: string): string | undefined {
    if (!componentStack) return undefined;

    // React component stack looks like:
    // "    at ComponentName (file:///path/to/file.tsx:42:15)"
    const match = componentStack.match(/at (\w+)/);
    return match?.[1];
  }

  /**
   * Reset error state and retry
   */
  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      reportSent: false,
    });
  };

  /**
   * Navigate to home
   */
  private handleGoHome = () => {
    this.setState({
      hasError: false,
      error: null,
      reportSent: false,
    });
    router.replace('/');
  };

  render() {
    const { hasError, error, isOnline, reportSent } = this.state;
    const { children, fallback, isGlobal } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback
    if (fallback) {
      return fallback;
    }

    const t = (key: string) => i18n.t(`errorBoundary.${key}`);

    return (
      <View className="flex-1 bg-white dark:bg-gray-900 items-center justify-center p-8">
        <Animated.View
          entering={FadeIn.duration(300)}
          className="items-center max-w-sm"
        >
          {/* Icon */}
          <Animated.View
            entering={SlideInUp.duration(400)}
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: '#FEE2E2' }}
          >
            <AlertTriangle size={40} color="#DC2626" />
          </Animated.View>

          {/* Title */}
          <Text className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {t('title')}
          </Text>

          {/* Message */}
          <Text className="text-base text-gray-600 dark:text-gray-400 text-center mb-6">
            {t('message')}
          </Text>

          {/* Error details (dev mode only) */}
          {__DEV__ && error && (
            <View className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 mb-6 w-full">
              <Text className="text-xs text-red-700 dark:text-red-300 font-mono">
                {error.name}: {error.message}
              </Text>
            </View>
          )}

          {/* Network status */}
          {!isOnline && (
            <View className="flex-row items-center bg-amber-50 dark:bg-amber-900/20 rounded-lg px-4 py-2 mb-4">
              <WifiOff size={16} color="#F59E0B" />
              <Text className="text-sm text-amber-700 dark:text-amber-400 ml-2">
                {t('offlineNote')}
              </Text>
            </View>
          )}

          {/* Report status */}
          {reportSent && (
            <Text className="text-xs text-green-600 dark:text-green-400 mb-4">
              ✓ {t('reportSent')}
            </Text>
          )}

          {/* Actions */}
          <View className="flex-row gap-3">
            <Button
              onPress={this.handleRetry}
              className="flex-1"
              variant="outline"
            >
              <RefreshCw size={18} color={PRIMARY_COLOR} />
              <ButtonText className="ml-2" style={{ color: PRIMARY_COLOR }}>
                {t('tryAgain')}
              </ButtonText>
            </Button>

            {isGlobal && (
              <Button
                onPress={this.handleGoHome}
                className="flex-1"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                <Home size={18} color="white" />
                <ButtonText className="ml-2 text-white">
                  {t('goHome')}
                </ButtonText>
              </Button>
            )}
          </View>
        </Animated.View>
      </View>
    );
  }
}

/**
 * HOC to wrap screens with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary screenName={screenName}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
