/**
 * Animated Bottom Tab Bar (Facebook-style)
 *
 * Features:
 * - Instant tab switching (0ms latency)
 * - Outlined to Filled icon transition
 * - Compact design
 * - Full-width active indicator
 * - Icon + label for clarity
 */

import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useRouter, useSegments } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Home, BookOpen, Calendar, User, Compass, Heart } from 'lucide-react-native';
import { colors, touchTargets } from '@/constants/theme';
import { useTranslation } from 'react-i18next';
import { useNavigationStore } from '@/stores/navigation';

interface Tab {
  name: string;
  icon: React.ComponentType<any>;
  label: string;
  route: string;
}

const TABS: Tab[] = [
  {
    name: 'home',
    icon: Home,
    label: 'tabs.home',
    route: '/(tabs)',
  },
  {
    name: 'bible',
    icon: BookOpen,
    label: 'tabs.bible',
    route: '/(tabs)/bible',
  },
  {
    name: 'give',
    icon: Heart,
    label: 'tabs.give',
    route: '/give',
  },
  {
    name: 'explore',
    icon: Compass,
    label: 'tabs.explore',
    route: '/(tabs)/explore',
  },
  {
    name: 'events',
    icon: Calendar,
    label: 'tabs.events',
    route: '/(tabs)/events',
  },
  {
    name: 'profile',
    icon: User,
    label: 'tabs.profile',
    route: '/(tabs)/profile',
  },
];

export function AnimatedTabBar() {
  const router = useRouter();
  const segments = useSegments();
  const { t } = useTranslation();
  const { calculateDirection } = useNavigationStore();

  // Determine active tab from route segments
  const activeRoute = `/(tabs)${segments[1] ? `/${segments[1]}` : ''}`;

  const handleTabPress = (tab: Tab) => {
    // Special handling for Give button
    if (tab.name === 'give') {
      router.push('/give');
      return;
    }

    // Don't navigate if already on this tab (prevents page blink)
    if (tab.route && activeRoute !== tab.route) {
      // Calculate and set animation direction before navigation
      calculateDirection(activeRoute, tab.route);
      router.push(tab.route as any);
    }
  };

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200"
      style={{
        paddingBottom: Platform.OS === 'ios' ? 16 : 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 8,
      }}
    >
      <View className="flex-row items-center">
        {TABS.map((tab, index) => {
          const isActive = activeRoute === tab.route;
          const IconComponent = tab.icon;

          return (
            <Pressable
              key={tab.name}
              onPress={() => handleTabPress(tab)}
              className="items-center justify-center active:opacity-60 relative"
              style={{
                flex: 1,
                minWidth: touchTargets.comfortable,
                paddingVertical: 9, // Increased from 7px to 9px
                paddingTop: 11, // Adjusted to maintain proportion
              }}
            >
              {/* Active indicator - full width, sticking to very top edge */}
              {isActive && (
                <MotiView
                  from={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ type: 'spring', duration: 250, damping: 15 }}
                  style={{
                    position: 'absolute',
                    top: -1, // -1px to stick to very top edge (accounts for border)
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: colors.primary[500],
                  }}
                />
              )}

              {/* Icon with outlined-to-filled transition */}
              <MotiView
                animate={{
                  scale: isActive ? 1.02 : 1,
                }}
                transition={{
                  type: 'spring',
                  damping: 20,
                }}
              >
                <IconComponent
                  size={24}
                  color={isActive ? colors.primary[500] : colors.gray[400]}
                  fill={isActive ? colors.primary[500] : 'none'} // Filled when active
                  strokeWidth={2} // Consistent 2px stroke for both states
                />
              </MotiView>

              {/* Label */}
              <Text
                size="xs"
                className={`mt-0.5 font-medium ${
                  isActive ? 'text-primary-500' : 'text-gray-500'
                }`}
                style={{ fontSize: 10 }}
              >
                {t(tab.label as any)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
