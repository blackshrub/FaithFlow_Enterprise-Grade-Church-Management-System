/**
 * HowCanWeHelpGrid - Contextual Actions Grid
 *
 * iOS Control Center style action grid.
 * Features:
 * - 4-column grid layout
 * - Dynamic visibility based on member profile
 * - Always visible: Prayer, Community, Give, Counseling
 * - Conditional: Event registration, Baptism, Child dedication, etc.
 *
 * Styling: NativeWind-first with inline styles for layout
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTranslation } from 'react-i18next';
import { HelpCircle } from 'lucide-react-native';
import Animated from 'react-native-reanimated';

import { PMotion } from '@/components/motion/premium-motion';
import { ActionGridItem } from './ActionGridItem';
import { getVisibleActions, type HelpGridContext } from './helpGridConfig';

// Dimensions
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PADDING_HORIZONTAL = 20;
const GRID_WIDTH = SCREEN_WIDTH - PADDING_HORIZONTAL * 2;
const COLUMNS = 4;
const CELL_SIZE = 72;
const HORIZONTAL_GAP = (GRID_WIDTH - CELL_SIZE * COLUMNS) / (COLUMNS - 1);
const VERTICAL_GAP = 20;

// Colors
const Colors = {
  accent: {
    primary: '#C9A962',
  },
};

interface HowCanWeHelpGridProps {
  /** Member's baptism status */
  isBaptized?: boolean;
  /** Member's marital status */
  maritalStatus?: string | null;
  /** Whether there are upcoming events */
  hasUpcomingEvents?: boolean;
  /** Show all actions regardless of conditions (default: true) */
  showAll?: boolean;
  focusKey?: number | string;
}

export const HowCanWeHelpGrid = memo(function HowCanWeHelpGrid({
  isBaptized = false,
  maritalStatus = null,
  hasUpcomingEvents = true,
  showAll = true, // Default to showing all items
  focusKey = 0,
}: HowCanWeHelpGridProps) {
  const { t } = useTranslation();

  // Get visible actions based on context
  const context: HelpGridContext = useMemo(
    () => ({
      isBaptized,
      maritalStatus,
      hasUpcomingEvents,
      showAll, // Pass showAll flag
    }),
    [isBaptized, maritalStatus, hasUpcomingEvents, showAll]
  );

  const visibleActions = useMemo(
    () => getVisibleActions(context),
    [context]
  );

  // Group actions into rows of 4
  const rows = useMemo(() => {
    const result: typeof visibleActions[] = [];
    for (let i = 0; i < visibleActions.length; i += COLUMNS) {
      result.push(visibleActions.slice(i, i + COLUMNS));
    }
    return result;
  }, [visibleActions]);

  return (
    <Animated.View
      key={`help-grid-${focusKey}`}
      entering={PMotion.sectionStagger(6)}
      className="mb-6 px-5"
    >
      {/* Section Header */}
      <View className="flex-row items-center gap-2 mb-4">
        <HelpCircle size={16} color={Colors.accent.primary} />
        <Text
          className="text-[13px] font-semibold text-typography-500 uppercase"
          style={{ letterSpacing: 1 }}
        >
          {t('today.howCanWeHelp', 'How Can We Help?')}
        </Text>
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {rows.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((action) => (
              <ActionGridItem
                key={action.id}
                action={action}
                label={t(action.labelKey, action.fallbackLabel)}
              />
            ))}
            {/* Fill empty cells to maintain layout */}
            {row.length < COLUMNS &&
              Array.from({ length: COLUMNS - row.length }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.emptyCell} />
              ))}
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  grid: {
    gap: VERTICAL_GAP,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  emptyCell: {
    width: CELL_SIZE,
  },
});
