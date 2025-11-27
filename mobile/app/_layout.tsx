import "../global.css";
import { Stack } from "expo-router";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { initializeI18n } from "@/i18n";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFonts } from "expo-font";
import { BIBLE_FONT_FILES } from "@/utils/fonts";
import Toast from 'react-native-toast-message';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { NoteEditorModal } from '@/components/bible/NoteEditorModal';
import { CategoryFilterModal } from '@/components/modals/CategoryFilterModal';
import { CalendarModal } from '@/components/modals/CalendarModal';
import { StreakDetailsSheet } from '@/components/explore/StreakDetailsSheet';
import { MQTTProvider } from '@/components/providers/MQTTProvider';
import { queryClient } from '@/lib/queryClient';
import { preloadBiblesOffline } from '@/hooks/useBibleOffline';
import { IncomingCallOverlay } from '@/components/call';
import { useCallSignalingInit } from '@/hooks/useCallSignaling';
import { callKitService } from '@/services/callkit';

/**
 * INSTANT BIBLE ACCESS - Preload default Bible translation on app startup
 * This runs SYNCHRONOUSLY before any component renders
 * Bible data is pre-required via require() - no async I/O needed
 */
preloadBiblesOffline(['NIV']); // Preload NIV (most common) immediately

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [i18nInitialized, setI18nInitialized] = useState(false);

  // Initialize call signaling when authenticated
  useCallSignalingInit();

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
  }, []);

  // Initialize CallKit for native call UI
  useEffect(() => {
    callKitService.setup().catch(console.error);

    return () => {
      callKitService.cleanup();
    };
  }, []);

  // Preload additional Bible translations after fonts are ready
  // This happens in background - NIV is already loaded synchronously above
  useEffect(() => {
    if (fontsLoaded) {
      // Preload other popular translations for instant switching
      preloadBiblesOffline(['ESV', 'TB', 'NLT']);
    }
  }, [fontsLoaded]);

  // Wait for i18n and fonts to initialize before rendering
  // This prevents font flashing and ensures smooth reading experience
  if (!i18nInitialized || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <GluestackUIProvider mode={colorScheme ?? "light"}>
          <BottomSheetModalProvider>
            {/* MQTT Provider for real-time messaging */}
            <MQTTProvider>
              <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />

              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="call/[id]"
                  options={{
                    animation: 'fade',
                    gestureEnabled: false, // Prevent accidental swipe-back during call
                  }}
                />
              </Stack>

              {/* Global bottom sheets - MUST be at root level */}
              <NoteEditorModal />
              <CategoryFilterModal />
              <CalendarModal />
              <StreakDetailsSheet />

              {/* Toast must be rendered at root level */}
              <Toast />

              {/* Incoming call overlay - displays over all content */}
              <IncomingCallOverlay />
            </MQTTProvider>
          </BottomSheetModalProvider>
        </GluestackUIProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
