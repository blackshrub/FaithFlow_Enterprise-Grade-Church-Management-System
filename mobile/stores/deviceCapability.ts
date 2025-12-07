/**
 * Device Capability Store - Lite Mode for Low-End Devices
 *
 * Automatically detects device capabilities and enables Lite Mode
 * for smoother performance on low-end smartphones.
 *
 * Lite Mode Effects:
 * - Animations reduced by 50% duration
 * - Stagger animations disabled (all items appear together)
 * - Scale animations disabled (opacity-only transitions)
 * - Image quality reduced (smaller thumbnails)
 * - React Query staleTime increased
 */

import { create } from 'zustand';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

// ============================================================================
// TYPES
// ============================================================================

export interface DeviceCapabilityState {
  /** Whether device is classified as low-end */
  isLowEndDevice: boolean;

  /** RAM in GB (Android only, null on iOS) */
  deviceRam: number | null;

  /** Device model name */
  deviceModel: string | null;

  /** iOS device generation (e.g., 8 for iPhone 8) */
  iOSGeneration: number | null;

  /** Whether Lite Mode is currently active */
  liteMode: boolean;

  /** Whether detection has completed */
  isDetected: boolean;

  /** Frame timing samples for performance detection */
  frameTimeSamples: number[];

  /** Average frame time in ms */
  averageFrameTime: number;
}

export interface DeviceCapabilityActions {
  /** Detect device capabilities on app start */
  detectCapabilities: () => Promise<void>;

  /** Manually enable/disable Lite Mode (for testing or user preference) */
  setLiteMode: (enabled: boolean) => void;

  /** Sample frame timing to detect performance issues */
  sampleFrameTiming: () => void;

  /** Check if animations should be reduced */
  shouldReduceAnimations: () => boolean;

  /** Check if stagger animations should be disabled */
  shouldDisableStagger: () => boolean;

  /** Get animation duration multiplier (1.0 = normal, 0.5 = lite) */
  getAnimationMultiplier: () => number;
}

export type DeviceCapabilityStore = DeviceCapabilityState & DeviceCapabilityActions;

// ============================================================================
// CONSTANTS
// ============================================================================

/** RAM threshold for low-end devices (in GB) */
const LOW_RAM_THRESHOLD_GB = 3;

/** Frame time threshold for low-perf detection (ms) */
const LOW_PERF_FRAME_THRESHOLD_MS = 20;

/** Number of frame samples to collect */
const FRAME_SAMPLE_SIZE = 5;

/** iPhone models considered low-end (iPhone 8 and older) */
const LOW_END_IPHONE_MODELS = [
  'iPhone1,1', // iPhone 1
  'iPhone1,2', // iPhone 3G
  'iPhone2,1', // iPhone 3GS
  'iPhone3,1', 'iPhone3,2', 'iPhone3,3', // iPhone 4
  'iPhone4,1', // iPhone 4S
  'iPhone5,1', 'iPhone5,2', // iPhone 5
  'iPhone5,3', 'iPhone5,4', // iPhone 5c
  'iPhone6,1', 'iPhone6,2', // iPhone 5s
  'iPhone7,1', // iPhone 6 Plus
  'iPhone7,2', // iPhone 6
  'iPhone8,1', // iPhone 6s
  'iPhone8,2', // iPhone 6s Plus
  'iPhone8,4', // iPhone SE (1st gen)
  'iPhone9,1', 'iPhone9,2', 'iPhone9,3', 'iPhone9,4', // iPhone 7, 7 Plus
  'iPhone10,1', 'iPhone10,2', 'iPhone10,3', 'iPhone10,4', 'iPhone10,5', 'iPhone10,6', // iPhone 8, 8 Plus, X
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse iOS device generation from model identifier
 * e.g., "iPhone10,1" -> 10
 */
const parseIOSGeneration = (modelId: string | null): number | null => {
  if (!modelId) return null;
  const match = modelId.match(/iPhone(\d+),/);
  return match ? parseInt(match[1], 10) : null;
};

/**
 * Check if device is low-end based on model/specs
 */
const checkIsLowEndDevice = async (): Promise<{
  isLowEnd: boolean;
  ram: number | null;
  model: string | null;
  iosGen: number | null;
}> => {
  const model = Device.modelId;
  const deviceType = await Device.getDeviceTypeAsync();

  // Tablets are generally more powerful
  if (deviceType === Device.DeviceType.TABLET) {
    return { isLowEnd: false, ram: null, model, iosGen: null };
  }

  if (Platform.OS === 'ios') {
    const iosGen = parseIOSGeneration(model);
    const isLowEnd = model ? LOW_END_IPHONE_MODELS.includes(model) : false;
    return { isLowEnd, ram: null, model, iosGen };
  }

  if (Platform.OS === 'android') {
    // Check Android API level (< 28 = Android 9 = older devices)
    const isOldAndroid = Platform.Version < 28;

    // Get RAM (expo-device provides this on Android)
    const totalMemory = Device.totalMemory;
    const ramGB = totalMemory ? totalMemory / (1024 * 1024 * 1024) : null;

    const isLowEnd = isOldAndroid || (ramGB !== null && ramGB < LOW_RAM_THRESHOLD_GB);
    return { isLowEnd, ram: ramGB, model, iosGen: null };
  }

  return { isLowEnd: false, ram: null, model, iosGen: null };
};

// ============================================================================
// STORE
// ============================================================================

export const useDeviceCapabilityStore = create<DeviceCapabilityStore>((set, get) => ({
  // Initial state
  isLowEndDevice: false,
  deviceRam: null,
  deviceModel: null,
  iOSGeneration: null,
  liteMode: false,
  isDetected: false,
  frameTimeSamples: [],
  averageFrameTime: 0,

  // Actions
  detectCapabilities: async () => {
    try {
      const { isLowEnd, ram, model, iosGen } = await checkIsLowEndDevice();

      set({
        isLowEndDevice: isLowEnd,
        deviceRam: ram,
        deviceModel: model,
        iOSGeneration: iosGen,
        liteMode: isLowEnd, // Auto-enable Lite Mode for low-end devices
        isDetected: true,
      });

      if (__DEV__) {
        console.log('[DeviceCapability] Detection complete:', {
          isLowEnd,
          ram: ram ? `${ram.toFixed(1)}GB` : 'N/A',
          model,
          iosGen,
          liteMode: isLowEnd,
        });
      }
    } catch (error) {
      console.warn('[DeviceCapability] Detection failed:', error);
      set({ isDetected: true });
    }
  },

  setLiteMode: (enabled: boolean) => {
    set({ liteMode: enabled });
    if (__DEV__) {
      console.log('[DeviceCapability] Lite Mode:', enabled ? 'ENABLED' : 'DISABLED');
    }
  },

  sampleFrameTiming: () => {
    const samples: number[] = [];
    let lastFrameTime = performance.now();
    let sampleCount = 0;

    const measureFrame = () => {
      const now = performance.now();
      const frameTime = now - lastFrameTime;
      lastFrameTime = now;

      samples.push(frameTime);
      sampleCount++;

      if (sampleCount < FRAME_SAMPLE_SIZE) {
        requestAnimationFrame(measureFrame);
      } else {
        const avgTime = samples.reduce((a, b) => a + b, 0) / samples.length;
        const isLowPerf = avgTime > LOW_PERF_FRAME_THRESHOLD_MS;

        set((state) => ({
          frameTimeSamples: samples,
          averageFrameTime: avgTime,
          // Enable Lite Mode if frame timing is poor
          liteMode: state.liteMode || isLowPerf,
        }));

        if (__DEV__) {
          console.log('[DeviceCapability] Frame timing:', {
            avgTime: `${avgTime.toFixed(2)}ms`,
            isLowPerf,
          });
        }
      }
    };

    requestAnimationFrame(measureFrame);
  },

  shouldReduceAnimations: () => {
    return get().liteMode;
  },

  shouldDisableStagger: () => {
    return get().liteMode;
  },

  getAnimationMultiplier: () => {
    return get().liteMode ? 0.5 : 1.0;
  },
}));

// ============================================================================
// SELECTOR HOOKS (for performance - avoid re-renders)
// ============================================================================

/** Check if Lite Mode is active */
export const useLiteMode = () => useDeviceCapabilityStore((state) => state.liteMode);

/** Check if device is low-end */
export const useIsLowEndDevice = () => useDeviceCapabilityStore((state) => state.isLowEndDevice);

/** Get animation multiplier */
export const useAnimationMultiplier = () =>
  useDeviceCapabilityStore((state) => (state.liteMode ? 0.5 : 1.0));

/** Get device RAM */
export const useDeviceRam = () => useDeviceCapabilityStore((state) => state.deviceRam);

/** Get detection status */
export const useIsDetected = () => useDeviceCapabilityStore((state) => state.isDetected);

// ============================================================================
// NON-REACTIVE GETTERS (for use outside React components)
// ============================================================================

/** Get current Lite Mode status without subscribing */
export const getLiteMode = (): boolean => {
  return useDeviceCapabilityStore.getState().liteMode;
};

/** Get animation multiplier without subscribing */
export const getAnimationMultiplier = (): number => {
  return useDeviceCapabilityStore.getState().liteMode ? 0.5 : 1.0;
};

/** Check if stagger should be disabled without subscribing */
export const shouldDisableStagger = (): boolean => {
  return useDeviceCapabilityStore.getState().liteMode;
};

/** Initialize device capability detection */
export const initDeviceCapability = async (): Promise<void> => {
  await useDeviceCapabilityStore.getState().detectCapabilities();
  // Also sample frame timing after a short delay
  setTimeout(() => {
    useDeviceCapabilityStore.getState().sampleFrameTiming();
  }, 1000);
};
