/**
 * StudiesModal - Unified Overlay System (Bottom Sheet)
 *
 * Shows Bible studies overview and progress.
 * Used via: overlay.showBottomSheet(StudiesModal, payload)
 */

import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, BookOpen, Clock, CheckCircle2, Play, ChevronRight } from 'lucide-react-native';

import type { OverlayProps } from '@/components/overlay/types';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { overlayTheme } from '@/theme/overlayTheme';
import { interaction } from '@/constants/interaction';

// Study type
interface BibleStudy {
  id: string;
  title: string;
  description?: string;
  totalDays: number;
  completedDays: number;
  isActive: boolean;
}

// Payload type
export interface StudiesPayload {
  studies: BibleStudy[];
  totalStudies: number;
  completedStudies: number;
  onStudyPress?: (studyId: string) => void;
}

export const StudiesModal: React.FC<OverlayProps<StudiesPayload>> = ({
  payload,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!payload) return null;

  const { studies, totalStudies, completedStudies, onStudyPress } = payload;

  const getStudyStatus = (study: BibleStudy) => {
    if (study.completedDays === study.totalDays) return 'completed';
    if (study.isActive || study.completedDays > 0) return 'in-progress';
    return 'not-started';
  };

  const getProgressPercent = (study: BibleStudy) => {
    return Math.round((study.completedDays / study.totalDays) * 100);
  };

  return (
    <View style={styles.sheetContainer}>
      {/* Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
      >
        <View style={styles.sheetContent}>
          {/* Header */}
          <HStack className="justify-between items-center mb-6">
            <HStack space="md" className="items-center">
              <View style={styles.headerIconContainer}>
                <BookOpen size={28} color={colors.primary[600]} />
              </View>
              <Heading size="xl" className="text-gray-900 font-bold">
                {t('explore.studies.title', 'Bible Studies')}
              </Heading>
            </HStack>

            <Pressable
              onPress={() => {
                interaction.haptics.tap();
                onClose();
              }}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressedMicro,
              ]}
            >
              <Icon as={X} size="md" className="text-gray-600" />
            </Pressable>
          </HStack>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primary[50] }]}>
                  <BookOpen size={24} color={colors.primary[600]} />
                </View>
                <Text style={[styles.statValue, { color: colors.primary[600] }]}>{totalStudies}</Text>
              </View>
              <Text style={styles.statLabel}>{t('explore.studies.total', 'Total Studies')}</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statRow}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.success[50] }]}>
                  <CheckCircle2 size={24} color={colors.success[600]} />
                </View>
                <Text style={[styles.statValue, { color: colors.success[600] }]}>{completedStudies}</Text>
              </View>
              <Text style={styles.statLabel}>{t('explore.studies.completed', 'Completed')}</Text>
            </View>
          </View>

          {/* Studies List */}
          {studies.length > 0 ? (
            <View style={styles.studiesContainer}>
              <Text style={styles.sectionTitle}>
                {t('explore.studies.yourStudies', 'Your Studies')}
              </Text>
              {studies.slice(0, 5).map((study) => {
                const status = getStudyStatus(study);
                const progress = getProgressPercent(study);

                return (
                  <Pressable
                    key={study.id}
                    onPress={() => {
                      if (onStudyPress) {
                        interaction.haptics.tap();
                        onStudyPress(study.id);
                        onClose();
                      }
                    }}
                    style={({ pressed }) => [
                      styles.studyItem,
                      pressed && styles.pressedMicro,
                    ]}
                  >
                    <View style={styles.studyContent}>
                      <View style={styles.studyHeader}>
                        <Text style={styles.studyTitle} numberOfLines={1}>{study.title}</Text>
                        {status === 'completed' ? (
                          <CheckCircle2 size={20} color={colors.success[500]} />
                        ) : status === 'in-progress' ? (
                          <Play size={20} color={colors.primary[500]} fill={colors.primary[500]} />
                        ) : (
                          <Clock size={20} color={colors.gray[400]} />
                        )}
                      </View>

                      <View style={styles.studyMeta}>
                        <Text style={styles.studyProgress}>
                          {study.completedDays}/{study.totalDays} {t('explore.studies.days', 'days')}
                        </Text>
                        <Text style={styles.studyPercent}>{progress}%</Text>
                      </View>

                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${progress}%`,
                              backgroundColor: status === 'completed'
                                ? colors.success[500]
                                : colors.primary[500]
                            }
                          ]}
                        />
                      </View>
                    </View>
                    <ChevronRight size={20} color={colors.gray[400]} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <BookOpen size={48} color={colors.gray[300]} />
              <Text style={styles.emptyTitle}>
                {t('explore.studies.noStudies', 'No Studies Yet')}
              </Text>
              <Text style={styles.emptyDescription}>
                {t('explore.studies.startStudying', 'Start a Bible study to deepen your faith and understanding of Scripture.')}
              </Text>
            </View>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>
              {t('explore.studies.whatAreStudies', 'What are Bible Studies?')}
            </Text>
            <Text style={styles.infoText}>
              {t('explore.studies.description', 'Bible studies are structured multi-day journeys through Scripture. Each study includes daily readings, reflections, and questions to help you grow spiritually.')}
            </Text>
          </View>

          {/* Close Button */}
          <Button
            onPress={() => {
              interaction.haptics.tap();
              onClose();
            }}
            size="lg"
            className="mt-4"
          >
            <ButtonText className="font-bold">{t('common.done')}</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  closeButton: {
    width: overlayTheme.closeButton.size,
    height: overlayTheme.closeButton.size,
    borderRadius: overlayTheme.closeButton.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overlayTheme.closeButton.backgroundColor,
  },
  pressedMicro: {
    opacity: interaction.press.opacity,
    transform: [{ scale: interaction.press.scale }],
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[50],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.gray[50],
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 44,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray[600],
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[800],
    marginBottom: spacing.md,
  },
  studiesContainer: {
    marginBottom: spacing.lg,
  },
  studyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius.xl,
    marginBottom: spacing.sm,
  },
  studyContent: {
    flex: 1,
  },
  studyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  studyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.gray[800],
    flex: 1,
    marginRight: spacing.sm,
  },
  studyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  studyProgress: {
    fontSize: 13,
    color: colors.gray[500],
  },
  studyPercent: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.gray[600],
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.gray[50],
    borderRadius: borderRadius['2xl'],
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[700],
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    padding: spacing.lg,
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.primary[50],
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[700],
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.primary[600],
    lineHeight: 20,
  },
});

export default StudiesModal;
