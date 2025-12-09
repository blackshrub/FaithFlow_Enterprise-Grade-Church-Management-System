/**
 * Tabs Layout - Custom AnimatedTabBar with center GROW FAB
 *
 * Note: "index" redirects to "today" to work around Expo Router lag
 * with index routes. The actual Today content is in today.tsx.
 */

import { Tabs } from 'expo-router';
import { AnimatedTabBar } from '@/components/navigation/AnimatedTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AnimatedTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // Load all tabs immediately to prevent flash on first visit
        lazy: false,
        // Keep state when switching tabs
        freezeOnBlur: true,
        // Transparent background to show persistent root background
        sceneStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* Hide index - it just redirects to today */}
      <Tabs.Screen name="index" options={{ href: null }} />

      {/* Main tabs (order matters for tab bar display) */}
      <Tabs.Screen name="today" />
      <Tabs.Screen name="events" />
      <Tabs.Screen name="groups" />
      <Tabs.Screen name="give" />

      {/* Hidden screens (accessed via GROW FAB or other navigation) */}
      <Tabs.Screen name="bible" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}
