// Polyfills must be imported FIRST before any other imports
import "react-native-url-polyfill/auto";

import "../global.css";

// Register third-party components for NativeWind className support
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
cssInterop(Image, { className: "style" });
cssInterop(LinearGradient, { className: "style" });

import { Stack } from "expo-router";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { initializeI18n } from "@/i18n";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { BIBLE_FONT_FILES } from "@/utils/fonts";
import Toast from 'react-native-toast-message';
import { UnifiedOverlayHost } from '@/components/overlay/UnifiedOverlayHost';
import { MQTTProvider } from '@/components/providers/MQTTProvider';
import { queryClient } from '@/lib/queryClient';
import { queryPersister, shouldPersistQuery } from '@/lib/storage';
import { preloadBiblesOffline } from '@/hooks/useBibleOffline';
// MMKV: Zustand stores with persist middleware auto-load from MMKV (sync)
// No need to manually call loadSettings/loadPreferences anymore
// DISABLED: Call feature temporarily disabled
// import { IncomingCallOverlay } from '@/components/call';
// import { useCallSignalingInit } from '@/hooks/useCallSignaling';
import { enableScreens } from 'react-native-screens';
import { markAppReady } from '@/utils/performance';
import { ErrorBoundary, flushCrashQueue } from '@/components/ErrorBoundary';
import { BiometricLockScreen } from '@/components/auth/BiometricLockScreen';
import { useBiometricLock } from '@/hooks/useBiometricLock';
import { BibleNoteEditorHost } from '@/components/bible/BibleNoteEditorHost';
import { useVoiceSettingsStore } from '@/stores/voiceSettings';
// Note: We do NOT use CallKit because iOS requires VoIP PushKit for CallKit (we use standard FCM)
// The in-app IncomingCallOverlay provides a WhatsApp-style UI instead

/**
 * GLOBAL PERFORMANCE OPTIMIZATIONS
 * Enable native screens for better performance
 */
enableScreens(true);

/**
 * INSTANT BIBLE ACCESS - Preload default Bible translation on app startup
 * This runs SYNCHRONOUSLY before any component renders
 * Bible data is pre-required via require() - no async I/O needed
 */
preloadBiblesOffline(['NIV']); // Preload NIV (most common) immediately

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [i18nInitialized, setI18nInitialized] = useState(false);

  // Biometric lock - locks app when backgrounded, prompts on resume
  useBiometricLock({ autoPrompt: true });

  // Initialize voice settings (TTS/STT) - required for AudioPlayButton visibility
  const loadVoiceSettings = useVoiceSettingsStore((state) => state.loadSettings);
  useEffect(() => {
    loadVoiceSettings();
  }, [loadVoiceSettings]);

  // Flush any queued crash reports when app starts
  useEffect(() => {
    flushCrashQueue();
  }, []);

  // DISABLED: Call feature temporarily disabled
  // useCallSignalingInit();

  /**
   * Load Bible reading fonts
   * These fonts are ONLY used in Bible reader components
   * The rest of the app uses Gluestack UI default fonts
   */
  const [fontsLoaded, _fontError] = useFonts(BIBLE_FONT_FILES);

  /**
   * SYNCHRONOUS BOOTSTRAPPING with MMKV
   *
   * i18n and Zustand stores now use MMKV (synchronous):
   * - initializeI18n() is now sync (MMKV)
   * - Voice settings auto-loaded by Zustand persist (MMKV)
   * - Reading preferences auto-loaded by Zustand persist (MMKV)
   *
   * This eliminates the loading delay from AsyncStorage!
   */
  useEffect(() => {
    // i18n is now synchronous with MMKV
    initializeI18n();
    setI18nInitialized(true);
  }, []);

  // Preload additional Bible translations after fonts are ready
  // This happens in background - NIV is already loaded synchronously above
  useEffect(() => {
    if (fontsLoaded) {
      // Preload other popular translations for instant switching
      preloadBiblesOffline(['ESV', 'TB', 'NLT']);
    }
  }, [fontsLoaded]);

  /**
   * SCREEN PREFETCHING - Preload screens for instant navigation
   * This reduces 200-400ms load time when navigating to these screens
   */
  useEffect(() => {
    if (i18nInitialized && fontsLoaded) {
      // Prefetch main tab screens after initial load
      const prefetchScreens = async () => {
        try {
          // Small delay to not block initial render
          await new Promise(resolve => setTimeout(resolve, 500));

          // Prefetch commonly navigated screens
          router.prefetch('/events/[id]' as any);
          router.prefetch('/community/[id]/chat' as any);
          router.prefetch('/prayer' as any);
          router.prefetch('/explore/devotion/[id]' as any);
          router.prefetch('/explore/quiz/[id]' as any);
        } catch (e) {
          // Prefetch is optional, don't crash on failure
        }
      };
      prefetchScreens();
    }
  }, [i18nInitialized, fontsLoaded]);

  // Always render providers first to ensure React Query is available
  // Wait for i18n and fonts before showing navigation content
  const isReady = i18nInitialized && fontsLoaded;

  /**
   * PERFORMANCE MONITORING - Track cold start time
   * Mark app as ready when i18n and fonts are loaded
   */
  useEffect(() => {
    if (isReady) {
      markAppReady();
    }
  }, [isReady]);

  return (
    <ErrorBoundary isGlobal>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: queryPersister,
          // Max age of 24 hours for persisted cache
          maxAge: 1000 * 60 * 60 * 24,
          // Buster key for cache invalidation on app updates
          buster: 'v1',
          // Filter which queries to persist (offline-first content only)
          dehydrateOptions: {
            shouldDehydrateQuery: (query) =>
              shouldPersistQuery(query.queryKey),
          },
        }}
      >
        <GluestackUIProvider mode={colorScheme ?? "light"}>
          {/* MQTT Provider for real-time messaging */}
          <MQTTProvider>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

            {/* Show nothing until i18n and fonts are ready */}
            {!isReady ? null : (
            <>
            {/**
             * Stack Navigation with Premium Motion V7 Integration
             *
             * V7 Shared Axis X transitions are handled by withPremiumMotionV6 HOC
             * at the screen level. expo-router's animation is set to 'none' to
             * let V7 have full control over transitions.
             *
             * Special cases:
             * - (auth): Has own transitions
             * - (tabs): Tab bar handles transitions
             * - call/[id]: Fullscreen overlay with fade
             * - prayer/new: FAB morph animation (skips V7)
             */}
            <Stack
              screenOptions={{
                headerShown: false,
                // V7: Let PageTransition handle animations for wrapped screens
                // Use 'none' for zero interference, screens handle their own transitions
                animation: 'none',
                // Optimize for 60fps
                animationTypeForReplace: 'push',
              }}
            >
              <Stack.Screen
                name="(auth)"
                options={{
                  animation: 'fade', // Auth has its own transition flow
                }}
              />
              <Stack.Screen
                name="(tabs)"
                options={{
                  animation: 'none', // Tabs use V7 PageTransition
                }}
              />
              {/* DISABLED: Call feature temporarily disabled */}
            {/* <Stack.Screen
                name="call/[id]"
                options={{
                  animation: 'fade', // Call screen needs fade overlay
                  gestureEnabled: false, // Prevent accidental swipe-back during call
                }}
              /> */}
              <Stack.Screen
                name="prayer/new"
                options={{
                  animation: 'none', // FAB morph handles animation
                  presentation: 'transparentModal',
                }}
              />
            </Stack>

            {/**
             * Unified Overlay Host - Simplified Version
             *
             * Single overlay system using Zustand store:
             * - useOverlay().showCenterModal() for center modals
             * - useOverlay().showBottomSheet() for bottom sheets
             * - useOverlay().close() to dismiss
             */}
            <UnifiedOverlayHost />

            {/* Bible Note Editor Host - bridges bibleUIStore to overlay system */}
            <BibleNoteEditorHost />

            {/* Toast must be rendered at root level */}
            <Toast />

            {/* DISABLED: Call feature temporarily disabled */}
            {/* <IncomingCallOverlay /> */}

            {/* Biometric lock screen overlay */}
            <BiometricLockScreen />
            </>
            )}
          </MQTTProvider>
        </GluestackUIProvider>
      </PersistQueryClientProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
