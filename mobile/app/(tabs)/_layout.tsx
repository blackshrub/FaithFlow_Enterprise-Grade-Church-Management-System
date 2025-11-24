/**
 * Tabs Layout with Custom Animated Tab Bar
 *
 * Screens:
 * - index.tsx (Home)
 * - bible.tsx
 * - events.tsx
 * - profile.tsx
 *
 * Note: "Give" is handled via modal, not a tab screen
 *
 * IMPORTANT: BottomSheetModalProvider is in app/_layout.tsx (root level)
 * This layout only renders tab content and tab bar
 */

import { View } from 'react-native';
import { Slot } from 'expo-router';
import { AnimatedTabBar } from '@/components/navigation/AnimatedTabBar';

export default function TabsLayout() {
  return (
    <View className="flex-1 bg-gray-50">
      {/* Content area */}
      <View className="flex-1">
        <Slot />
      </View>

      {/* Custom animated tab bar */}
      <AnimatedTabBar />
    </View>
  );
}
