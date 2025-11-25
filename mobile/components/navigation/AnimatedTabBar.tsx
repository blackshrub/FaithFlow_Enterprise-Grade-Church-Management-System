/**
 * Animated Bottom Tab Bar (Facebook-style)
 *
 * Features:
 * - Smooth tab transitions with Moti
 * - Compact height for more screen space
 * - Large icons (28px) for easy recognition
 * - Active indicator at top of navbar
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
    route: '/give', // Special route - opens Give screen
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
                paddingVertical: 6,
                paddingTop: 10,
              }}
            >
              {/* Active indicator - at the very top */}
              {isActive && (
                <MotiView
                  from={{ opacity: 0, scaleX: 0 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ type: 'timing', duration: 200 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    marginLeft: -20,
                    width: 40,
                    height: 3,
                    backgroundColor: colors.primary[500],
                  }}
                />
              )}

              {/* Icon */}
              <MotiView
                animate={{
                  scale: isActive ? 1.05 : 1,
                }}
                transition={{
                  type: 'spring',
                  damping: 20,
                }}
              >
                <IconComponent
                  size={28}
                  color={isActive ? colors.primary[500] : colors.gray[400]}
                  strokeWidth={isActive ? 2.5 : 2}
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
