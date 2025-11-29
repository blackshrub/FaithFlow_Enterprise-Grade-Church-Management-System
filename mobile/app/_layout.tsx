// Polyfills must be imported FIRST before any other imports
import "react-native-url-polyfill/auto";

import "../global.css";
import { Stack } from "expo-router";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useState, useCallback } from "react";
import { router } from "expo-router";
import { initializeI18n } from "@/i18n";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { BIBLE_FONT_FILES } from "@/utils/fonts";
import Toast from 'react-native-toast-message';
import { UnifiedOverlayHost } from '@/components/overlay/UnifiedOverlayHost';
import { MQTTProvider } from '@/components/providers/MQTTProvider';
import { queryClient } from '@/lib/queryClient';
import { preloadBiblesOffline } from '@/hooks/useBibleOffline';
import { useVoiceSettingsStore } from '@/stores/voiceSettings';
import { useReadingPreferencesStore } from '@/stores/readingPreferences';
// DISABLED: Call feature temporarily disabled
// import { IncomingCallOverlay } from '@/components/call';
// import { useCallSignalingInit } from '@/hooks/useCallSignaling';
import { enableScreens } from 'react-native-screens';
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

  // DISABLED: Call feature temporarily disabled
  // useCallSignalingInit();

  /**
   * Load Bible reading fonts
   * These fonts are ONLY used in Bible reader components
   * The rest of the app uses Gluestack UI default fonts
   */
  const [fontsLoaded, _fontError] = useFonts(BIBLE_FONT_FILES);

  useEffect(() => {
    initializeI18n().then(() => {
      setI18nInitialized(true);
    });

    // Load voice settings and reading preferences
    useVoiceSettingsStore.getState().loadSettings();
    useReadingPreferencesStore.getState().loadPreferences();
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

  // Wait for i18n and fonts to initialize before rendering
  // This prevents font flashing and ensures smooth reading experience
  if (!i18nInitialized || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <GluestackUIProvider mode={colorScheme ?? "light"}>
          {/* MQTT Provider for real-time messaging */}
          <MQTTProvider>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

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

            {/* Toast must be rendered at root level */}
            <Toast />

            {/* DISABLED: Call feature temporarily disabled */}
            {/* <IncomingCallOverlay /> */}
          </MQTTProvider>
        </GluestackUIProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
