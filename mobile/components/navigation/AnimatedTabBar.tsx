/**
 * Animated Bottom Tab Bar with Central FAB
 *
 * Features:
 * - Smooth tab transitions with Moti
 * - Central floating action button for "Give"
 * - Large touch targets (56px) for accessibility
 * - Icon + label for clarity
 * - Active indicator with smooth animation
 */

import React from 'react';
import { View, Pressable, Platform } from 'react-native';
import { MotiView } from 'moti';
import { useRouter, useSegments } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Home, BookOpen, Calendar, Users, User, Compass } from 'lucide-react-native';
import { colors, touchTargets, shadows } from '@/constants/theme';
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
    name: 'give', // Placeholder for FAB
    icon: () => null,
    label: '',
    route: '',
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
    // Don't navigate if already on this tab (prevents page blink)
    if (tab.route && activeRoute !== tab.route) {
      // Calculate and set animation direction before navigation
      calculateDirection(activeRoute, tab.route);
      router.push(tab.route as any);
    }
  };

  const handleGivePress = () => {
    router.push('/give');
  };

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200"
      style={{
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        ...shadows.lg,
      }}
    >
      <View className="flex-row items-center px-2 pt-2">
        {TABS.map((tab, index) => {
          // Central FAB for Give
          if (tab.name === 'give') {
            return (
              <View
                key={tab.name}
                className="items-center justify-center"
                style={{
                  flex: 1,
                  minWidth: touchTargets.comfortable,
                  minHeight: touchTargets.comfortable,
                }}
              >
                <Pressable
                  onPress={handleGivePress}
                  className="active:opacity-80"
                  style={{
                    width: touchTargets.large,
                    height: touchTargets.large,
                    borderRadius: touchTargets.large / 2,
                    backgroundColor: colors.secondary[500],
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: -32,
                    ...shadows.xl,
                  }}
                >
                  <MotiView
                    from={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      duration: 300,
                    }}
                  >
                    <Icon
                      as={require('lucide-react-native').Heart}
                      size="xl"
                      className="text-white"
                    />
                  </MotiView>
                </Pressable>
                <Text
                  size="2xs"
                  className="text-gray-600 mt-1 font-medium"
                  style={{ fontSize: 10 }}
                >
                  {t('tabs.give' as any) || 'Give'}
                </Text>
              </View>
            );
          }

          const isActive = activeRoute === tab.route;
          const IconComponent = tab.icon;

          return (
            <Pressable
              key={tab.name}
              onPress={() => handleTabPress(tab)}
              className="items-center justify-center active:opacity-60"
              style={{
                flex: 1,
                minWidth: touchTargets.comfortable,
                minHeight: touchTargets.comfortable,
                paddingVertical: 8,
              }}
            >
              {/* Active indicator */}
              {isActive && (
                <MotiView
                  from={{ opacity: 0, translateY: 5 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{ type: 'timing', duration: 200 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: colors.primary[500],
                  }}
                />
              )}

              {/* Icon */}
              <MotiView
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{
                  type: 'spring',
                  damping: 20,
                }}
              >
                <Icon
                  as={IconComponent}
                  size="lg"
                  className={isActive ? 'text-primary-500' : 'text-gray-400'}
                />
              </MotiView>

              {/* Label */}
              <Text
                size="xs"
                className={`mt-1 font-medium ${
                  isActive ? 'text-primary-500' : 'text-gray-500'
                }`}
                style={{ fontSize: 11 }}
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
