/**
 * StudiesModal - Unified Overlay System (Bottom Sheet)
 *
 * Shows Bible studies overview and progress.
 * Used via: overlay.showBottomSheet(StudiesModal, payload)
 *
 * Standardized styling:
 * - Header title: 22px font-bold
 * - Close button: 44x44 with 20px icon
 * - NativeWind + minimal inline styles
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, BookOpen, Clock, CheckCircle2, Play, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { OverlayProps } from '@/components/overlay/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Consistent colors
const Colors = {
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',
    600: '#059669',
  },
};

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
    <View
      className="bg-white rounded-t-3xl"
      style={{
        maxHeight: SCREEN_HEIGHT * 0.85,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
      }}
    >
      {/* Handle indicator */}
      <View className="items-center pt-3 pb-1">
        <View className="w-10 h-1 rounded-full bg-neutral-300" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      >
        <View className="px-5 pt-2">
          {/* Header */}
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-3">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: Colors.primary[50] }}
              >
                <BookOpen size={26} color={Colors.primary[600]} />
              </View>
              <Text
                className="text-[22px] font-bold text-neutral-900"
                style={{ letterSpacing: -0.3 }}
              >
                {t('explore.studies.title', 'Bible Studies')}
              </Text>
            </View>

            {/* Close button - 44px */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              className="w-11 h-11 rounded-full bg-neutral-100 items-center justify-center active:opacity-70"
            >
              <X size={20} color={Colors.neutral[600]} />
            </Pressable>
          </View>

          {/* Stats Grid */}
          <View className="flex-row gap-3 mb-5">
            <View className="flex-1 items-center py-5 px-3 rounded-2xl bg-neutral-50">
              <View className="flex-row items-center gap-3 mb-1">
                <View
                  className="w-11 h-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.primary[50] }}
                >
                  <BookOpen size={22} color={Colors.primary[600]} />
                </View>
                <Text className="text-[40px] font-bold" style={{ color: Colors.primary[600], lineHeight: 44 }}>
                  {totalStudies}
                </Text>
              </View>
              <Text className="text-[14px] font-medium text-neutral-600 mt-1">
                {t('explore.studies.total', 'Total Studies')}
              </Text>
            </View>

            <View className="flex-1 items-center py-5 px-3 rounded-2xl bg-neutral-50">
              <View className="flex-row items-center gap-3 mb-1">
                <View
                  className="w-11 h-11 rounded-full items-center justify-center"
                  style={{ backgroundColor: Colors.success[50] }}
                >
                  <CheckCircle2 size={22} color={Colors.success[600]} />
                </View>
                <Text className="text-[40px] font-bold" style={{ color: Colors.success[600], lineHeight: 44 }}>
                  {completedStudies}
                </Text>
              </View>
              <Text className="text-[14px] font-medium text-neutral-600 mt-1">
                {t('explore.studies.completed', 'Completed')}
              </Text>
            </View>
          </View>

          {/* Studies List */}
          {studies.length > 0 ? (
            <View className="mb-5">
              <Text className="text-base font-semibold text-neutral-800 mb-3">
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
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onStudyPress(study.id);
                        onClose();
                      }
                    }}
                    className="flex-row items-center p-3 bg-neutral-50 rounded-xl mb-2 active:opacity-80"
                  >
                    <View className="flex-1">
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="text-[15px] font-semibold text-neutral-800 flex-1 mr-2" numberOfLines={1}>
                          {study.title}
                        </Text>
                        {status === 'completed' ? (
                          <CheckCircle2 size={20} color={Colors.success[500]} />
                        ) : status === 'in-progress' ? (
                          <Play size={20} color={Colors.primary[500]} fill={Colors.primary[500]} />
                        ) : (
                          <Clock size={20} color={Colors.neutral[400]} />
                        )}
                      </View>

                      <View className="flex-row items-center justify-between mb-2">
                        <Text className="text-[13px] text-neutral-500">
                          {study.completedDays}/{study.totalDays} {t('explore.studies.days', 'days')}
                        </Text>
                        <Text className="text-[13px] font-semibold text-neutral-600">{progress}%</Text>
                      </View>

                      <View className="h-1.5 bg-neutral-200 rounded overflow-hidden">
                        <View
                          className="h-full rounded"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: status === 'completed'
                              ? Colors.success[500]
                              : Colors.primary[500],
                          }}
                        />
                      </View>
                    </View>
                    <ChevronRight size={20} color={Colors.neutral[400]} style={{ marginLeft: 8 }} />
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View className="items-center p-6 bg-neutral-50 rounded-2xl mb-5">
              <BookOpen size={48} color={Colors.neutral[300]} />
              <Text className="text-[18px] font-semibold text-neutral-700 mt-3 mb-2">
                {t('explore.studies.noStudies', 'No Studies Yet')}
              </Text>
              <Text className="text-[14px] text-neutral-500 text-center leading-5">
                {t('explore.studies.startStudying', 'Start a Bible study to deepen your faith and understanding of Scripture.')}
              </Text>
            </View>
          )}

          {/* Info Card */}
          <View className="p-4 rounded-2xl mb-5" style={{ backgroundColor: Colors.primary[50] }}>
            <Text className="text-[15px] font-semibold mb-2" style={{ color: Colors.primary[700] }}>
              {t('explore.studies.whatAreStudies', 'What are Bible Studies?')}
            </Text>
            <Text className="text-[14px] leading-5" style={{ color: Colors.primary[600] }}>
              {t('explore.studies.description', 'Bible studies are structured multi-day journeys through Scripture. Each study includes daily readings, reflections, and questions to help you grow spiritually.')}
            </Text>
          </View>

          {/* Done Button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            className="items-center justify-center py-4 rounded-2xl active:opacity-80"
            style={{
              backgroundColor: Colors.primary[600],
              shadowColor: Colors.primary[600],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text className="text-base font-bold text-white">
              {t('common.done', 'Done')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default StudiesModal;
