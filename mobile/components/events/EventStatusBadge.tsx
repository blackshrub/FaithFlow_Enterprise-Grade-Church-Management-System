/**
 * Event Status Badge Component
 *
 * Displays status badge with subtle fade-in animation
 * Uses Moti for declarative animations
 */

import React from 'react';
import { View } from 'react-native';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { Text } from '@/components/ui/text';
import { EventStatus, getStatusConfig } from '@/utils/eventStatus';

interface EventStatusBadgeProps {
  status: EventStatus;
  size?: 'sm' | 'md';
  delay?: number;
}

export function EventStatusBadge({ status, size = 'sm', delay = 0 }: EventStatusBadgeProps) {
  const { t } = useTranslation();
  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'px-2 py-0.5',
    md: 'px-3 py-1',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: -4 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: 'timing',
        duration: 250,
        delay,
      }}
    >
      <View
        className={`rounded-full ${sizeClasses[size]}`}
        style={{ backgroundColor: config.bgColor }}
      >
        <Text
          className={`font-semibold ${textSizeClasses[size]}`}
          style={{ color: config.textColor }}
        >
          {t(`events.status.${status}`)}
        </Text>
      </View>
    </MotiView>
  );
}
