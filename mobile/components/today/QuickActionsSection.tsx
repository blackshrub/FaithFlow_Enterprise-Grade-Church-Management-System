/**
 * QuickActionsSection - Navigation Cards (Memoized)
 *
 * Extracted from Today screen for performance optimization.
 * Features:
 * - Grid of quick action cards
 * - Icon, label, description
 * - Navigation callbacks
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { memo, useCallback } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  BookOpen,
  Calendar,
  Users,
  Compass,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';

import { PremiumCard2 } from '@/components/ui/premium-card';

// Quick action definitions with i18n keys
const QUICK_ACTIONS: {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  defaultLabel: string;
  route: string;
  descKey: string;
  defaultDesc: string;
}[] = [
  {
    id: 'bible',
    icon: BookOpen,
    labelKey: 'today.quickActions.bible',
    defaultLabel: 'Bible',
    route: '/(tabs)/bible',
    descKey: 'today.quickActions.bibleDesc',
    defaultDesc: 'Read Scripture',
  },
  {
    id: 'explore',
    icon: Compass,
    labelKey: 'today.quickActions.explore',
    defaultLabel: 'Explore',
    route: '/(tabs)/explore',
    descKey: 'today.quickActions.exploreDesc',
    defaultDesc: 'Devotions & Studies',
  },
  {
    id: 'events',
    icon: Calendar,
    labelKey: 'today.quickActions.events',
    defaultLabel: 'Events',
    route: '/(tabs)/events',
    descKey: 'today.quickActions.eventsDesc',
    defaultDesc: 'Upcoming Activities',
  },
  {
    id: 'community',
    icon: Users,
    labelKey: 'today.quickActions.community',
    defaultLabel: 'Community',
    route: '/(tabs)/groups',
    descKey: 'today.quickActions.communityDesc',
    defaultDesc: 'Connect with Others',
  },
];

function QuickActionsSectionComponent() {
  const { t } = useTranslation();
  const router = useRouter();

  const handlePress = useCallback(
    (route: string) => {
      // Type assertion for dynamic routes - route is validated at definition time
      router.push(route as never);
    },
    [router]
  );

  return (
    <View className="mb-6">
      <Text
        className="text-xl font-bold text-typography-900 mb-4"
        style={{ letterSpacing: -0.3 }}
      >
        {t('today.quickAccess', 'Quick Access')}
      </Text>

      <View className="gap-3">
        {QUICK_ACTIONS.map((action) => {
          const ActionIcon = action.icon;
          return (
            <PremiumCard2
              key={action.id}
              onPress={() => handlePress(action.route)}
              innerStyle={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}
            >
              <View className="w-12 h-12 rounded-[14px] bg-background-100 items-center justify-center">
                <ActionIcon size={24} color="#262626" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-typography-900">
                  {t(action.labelKey, action.defaultLabel)}
                </Text>
                <Text className="text-[13px] text-typography-500 mt-0.5">
                  {t(action.descKey, action.defaultDesc)}
                </Text>
              </View>
              <ChevronRight size={18} color="#A3A3A3" />
            </PremiumCard2>
          );
        })}
      </View>
    </View>
  );
}

export const QuickActionsSection = memo(QuickActionsSectionComponent);
QuickActionsSection.displayName = 'QuickActionsSection';
