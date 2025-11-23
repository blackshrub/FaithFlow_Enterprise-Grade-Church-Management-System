import "../global.css";
import { Stack } from "expo-router";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "nativewind";

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

  return (
    <QueryClientProvider client={queryClient}>
      <GluestackUIProvider mode={colorScheme ?? "light"}>
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
      </GluestackUIProvider>
    </QueryClientProvider>
  );
}
