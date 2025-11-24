import "../global.css";
import { Stack } from "expo-router";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";
import { useEffect, useState } from "react";
import { initializeI18n } from "@/i18n";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { useFonts } from "expo-font";
import { BIBLE_FONT_FILES } from "@/utils/fonts";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

export default function RootLayout() {
  const { colorScheme } = useColorScheme();
  const [i18nInitialized, setI18nInitialized] = useState(false);

  /**
   * Load Bible reading fonts
   * These fonts are ONLY used in Bible reader components
   * The rest of the app uses Gluestack UI default fonts
   */
  const [fontsLoaded, fontError] = useFonts(BIBLE_FONT_FILES);

  useEffect(() => {
    initializeI18n().then(() => {
      setI18nInitialized(true);
    });
  }, []);

  // Log font loading errors
  useEffect(() => {
    if (fontError) {
      console.error('Failed to load Bible fonts:', fontError);
    } else if (fontsLoaded) {
      console.log('✅ All Bible fonts loaded successfully');
    }
  }, [fontsLoaded, fontError]);

  // Wait for i18n and fonts to initialize before rendering
  // This prevents font flashing and ensures smooth reading experience
  if (!i18nInitialized || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <GluestackUIProvider mode={colorScheme ?? "light"}>
          <ToastProvider>
            <BottomSheetModalProvider>
              <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: "fade",
                }}
              >
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
              </Stack>
            </BottomSheetModalProvider>
          </ToastProvider>
        </GluestackUIProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
