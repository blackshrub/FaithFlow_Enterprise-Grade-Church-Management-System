/**
 * Grow Card Component
 *
 * Large touch-friendly card for Bible and Explore quick access.
 * Features gradient background, icon, and animated entrance.
 *
 * Styling: NativeWind-first with inline style for shadows/dynamic values
 */

import React from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BookOpen, Compass } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { colors, shadows } from '@/constants/theme';
import { useGrowStore } from '@/stores/growStore';

interface GrowCardProps {
  type: 'bible' | 'explore';
  title: string;
  subtitle: string;
  delay?: number;
}

const CARD_CONFIG = {
  bible: {
    icon: BookOpen,
    gradient: ['#0066ff', '#003d99'] as [string, string],
    route: '/(tabs)/bible' as const,
  },
  explore: {
    icon: Compass,
    gradient: ['#ff7300', '#cc5c00'] as [string, string],
    route: '/(tabs)/explore' as const,
  },
};

export function GrowCard({ type, title, subtitle, delay = 0 }: GrowCardProps) {
  const router = useRouter();
  const { close } = useGrowStore();
  const config = CARD_CONFIG[type];
  const IconComponent = config.icon;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Close panel first
    close();
    // Navigate immediately - use navigate for tab switching
    router.navigate(config.route);
  };

  // Note: Parent GrowPanel already animates opacity, so we use View instead of Animated.View
  // to avoid "opacity may be overwritten by layout animation" warning
  return (
    <View className="flex-1 min-h-[140px]">
      <Pressable
        onPress={handlePress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Open ${title} - ${subtitle}`}
        className="flex-1 min-h-[140px] rounded-2xl overflow-hidden active:opacity-90 active:scale-[0.98]"
        style={{ ...shadows.lg }}
      >
        <LinearGradient
          colors={config.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="flex-1 p-5 justify-between relative overflow-hidden"
        >
          {/* Icon */}
          <View className="w-16 h-16 rounded-[32px] bg-white/20 items-center justify-center">
            <IconComponent size={32} color={colors.white} strokeWidth={2} />
          </View>

          {/* Text */}
          <View className="gap-1">
            <Text className="text-xl font-bold text-white">{title}</Text>
            <Text className="text-[13px] font-medium text-white/80">{subtitle}</Text>
          </View>

          {/* Decorative circles */}
          <View className="absolute -top-[30px] -right-[30px] w-[100px] h-[100px] rounded-[50px] bg-white/10" />
          <View className="absolute -bottom-10 -left-10 w-[120px] h-[120px] rounded-[60px] bg-white/10" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}
