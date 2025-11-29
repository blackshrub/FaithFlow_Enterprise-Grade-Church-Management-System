/**
 * Tabs Layout with Native-Instant Navigation
 *
 * New Navigation Design:
 * - Today tab (home/index)
 * - Events tab
 * - GROW FAB (center - opens Bible/Explore panel)
 * - Community tab (groups)
 * - Give tab
 * - Profile (moved to header - accessible from all screens)
 *
 * Hidden tabs (accessible via GROW panel):
 * - Bible
 * - Explore
 *
 * Performance Optimizations:
 * - ALL animations disabled
 * - All screens pre-mounted (lazy: false)
 * - Zero latency tab switching
 */

import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { AnimatedTabBar } from '@/components/navigation/AnimatedTabBar';
import { GrowPanel } from '@/components/grow';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={() => <AnimatedTabBar />}
        screenOptions={{
          headerShown: false,
          // CRITICAL: Disable ALL animations for instant switching
          animation: 'none',
          animationDuration: 0,
          // Pre-mount all tabs immediately (zero-latency switching)
          lazy: false,
          // Don't freeze screens when blurred (keeps them ready)
          freezeOnBlur: false,
          // Ensure detached screens stay mounted
          unmountOnBlur: false,
        }}
      >
        {/* Main visible tabs */}
        <Tabs.Screen
          name="index"
          options={{
            href: '/(tabs)',
          }}
        />
        <Tabs.Screen name="events" />
        <Tabs.Screen name="groups" />
        <Tabs.Screen name="give" />

        {/* Hidden tabs (accessible via GROW panel) */}
        <Tabs.Screen
          name="bible"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            href: null, // Hide from tab bar
          }}
        />

        {/* Profile - moved to header, hidden from tab bar */}
        <Tabs.Screen
          name="profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>

      {/* GROW Panel Overlay - rendered above tabs */}
      <GrowPanel />
    </View>
  );
}
