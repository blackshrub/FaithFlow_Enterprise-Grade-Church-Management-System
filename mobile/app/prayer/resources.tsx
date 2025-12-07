/**
 * Prayer Resources Screen
 *
 * Shows immediately after prayer submission:
 * - Relevant scriptures based on prayer themes
 * - Guided prayer option
 * - Encouragement message
 *
 * Uses Prayer Intelligence analysis from backend.
 */

import React, { useState, useEffect } from 'react';
import { ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import {
  CheckCircle2,
  BookOpen,
  Sparkles,
  Heart,
  ChevronRight,
  Home,
  MessageCircle,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { LinearGradient } from 'expo-linear-gradient';

import { prayerApi, type PrayerResource } from '@/services/api/prayer';
import { colors, borderRadius, shadows } from '@/constants/theme';

// Theme display config
const THEME_DISPLAY: Record<string, { label: { en: string; id: string }; icon: LucideIcon; color: string }> = {
  health: { label: { en: 'Health & Healing', id: 'Kesehatan & Pemulihan' }, icon: Heart, color: '#EF4444' },
  anxiety: { label: { en: 'Peace & Rest', id: 'Damai & Istirahat' }, icon: Sparkles, color: '#8B5CF6' },
  grief: { label: { en: 'Comfort', id: 'Penghiburan' }, icon: Heart, color: '#6366F1' },
  financial: { label: { en: 'Provision', id: 'Pemeliharaan' }, icon: Sparkles, color: '#10B981' },
  relationships: { label: { en: 'Relationships', id: 'Hubungan' }, icon: Heart, color: '#EC4899' },
  guidance: { label: { en: 'Wisdom', id: 'Hikmat' }, icon: BookOpen, color: '#3B82F6' },
  faith_struggle: { label: { en: 'Faith', id: 'Iman' }, icon: Sparkles, color: '#F59E0B' },
  gratitude: { label: { en: 'Gratitude', id: 'Syukur' }, icon: Heart, color: '#10B981' },
};

export default function PrayerResourcesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ prayerId: string; resources: string }>();
  const language = (i18n.language || 'en') as 'en' | 'id';

  const [resources, setResources] = useState<PrayerResource | null>(null);
  const [guidedPrayer, setGuidedPrayer] = useState<string | null>(null);
  const [isLoadingPrayer, setIsLoadingPrayer] = useState(false);
  const [showGuidedPrayer, setShowGuidedPrayer] = useState(false);

  // Parse resources from params or fetch
  useEffect(() => {
    if (params.resources) {
      try {
        const parsed = JSON.parse(params.resources);
        setResources(parsed);
      } catch (e) {
        console.warn('Failed to parse resources:', e);
      }
    } else if (params.prayerId) {
      // Fetch resources if not passed
      prayerApi.getResources(params.prayerId).then((data) => {
        setResources(data.resources);
      }).catch(console.error);
    }
  }, [params.resources, params.prayerId]);

  // Handle guided prayer generation
  const handleGetGuidedPrayer = async () => {
    if (!resources?.themes?.length) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoadingPrayer(true);

    try {
      const response = await prayerApi.getGuidedPrayer(resources.themes, language);
      setGuidedPrayer(response.guided_prayer);
      setShowGuidedPrayer(true);
    } catch (error) {
      console.error('Failed to get guided prayer:', error);
    } finally {
      setIsLoadingPrayer(false);
    }
  };

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/');
  };

  const handleTalkToCompanion = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/companion');
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Success Header */}
        <Animated.View entering={FadeIn.duration(400)}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-6 pt-8 pb-10"
          >
            <VStack space="md" className="items-center">
              <View
                className="w-20 h-20 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <CheckCircle2 size={48} color="#FFFFFF" />
              </View>
              <Heading size="xl" className="text-white text-center">
                {language === 'en' ? 'Prayer Submitted' : 'Doa Terkirim'}
              </Heading>
              <Text className="text-white/90 text-center" size="md">
                {language === 'en'
                  ? 'Your prayer has been received. We are praying with you.'
                  : 'Doa Anda telah diterima. Kami berdoa bersama Anda.'}
              </Text>
            </VStack>
          </LinearGradient>
        </Animated.View>

        <VStack space="lg" className="px-6 py-6 -mt-4">
          {/* Themes Identified */}
          {resources?.themes && resources.themes.length > 0 && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)}>
              <Card style={{ borderRadius: borderRadius.xl, ...shadows.md }}>
                <VStack space="md" className="p-5">
                  <HStack space="sm" className="items-center">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.primary[50] }}
                    >
                      <Sparkles size={20} color={colors.primary[500]} />
                    </View>
                    <VStack>
                      <Heading size="sm" className="text-gray-900">
                        {language === 'en' ? 'We Understand' : 'Kami Memahami'}
                      </Heading>
                      <Text size="xs" className="text-gray-500">
                        {language === 'en' ? 'Themes in your prayer' : 'Tema dalam doa Anda'}
                      </Text>
                    </VStack>
                  </HStack>

                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {resources.themes.map((theme, index) => {
                      const config = THEME_DISPLAY[theme] || {
                        label: { en: theme, id: theme },
                        icon: Heart,
                        color: colors.gray[500],
                      };
                      return (
                        <View
                          key={index}
                          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full"
                          style={{ backgroundColor: `${config.color}15` }}
                        >
                          <config.icon size={14} color={config.color} />
                          <Text size="sm" style={{ color: config.color, fontWeight: '600' }}>
                            {config.label[language]}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </VStack>
              </Card>
            </Animated.View>
          )}

          {/* Suggested Scriptures */}
          {resources?.suggested_scriptures && resources.suggested_scriptures.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)}>
              <Card style={{ borderRadius: borderRadius.xl, ...shadows.md }}>
                <VStack space="md" className="p-5">
                  <HStack space="sm" className="items-center">
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.blue[50] }}
                    >
                      <BookOpen size={20} color={colors.blue[500]} />
                    </View>
                    <VStack>
                      <Heading size="sm" className="text-gray-900">
                        {language === 'en' ? 'Scriptures for You' : 'Ayat untuk Anda'}
                      </Heading>
                      <Text size="xs" className="text-gray-500">
                        {language === 'en' ? 'Words of comfort and hope' : 'Kata-kata penghiburan dan harapan'}
                      </Text>
                    </VStack>
                  </HStack>

                  <VStack space="sm" className="mt-2">
                    {resources.suggested_scriptures.slice(0, 3).map((scripture, index) => (
                      <Pressable
                        key={index}
                        className="active:opacity-80"
                        onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                      >
                        <View
                          className="p-4 rounded-xl"
                          style={{ backgroundColor: colors.gray[50] }}
                        >
                          <HStack className="items-center justify-between">
                            <VStack className="flex-1">
                              <Text className="text-gray-900 font-semibold" size="md">
                                {scripture.book} {scripture.chapter}:{scripture.verses}
                              </Text>
                              <Text className="text-gray-600" size="sm">
                                {scripture.topic}
                              </Text>
                            </VStack>
                            <ChevronRight size={20} color={colors.gray[400]} />
                          </HStack>
                        </View>
                      </Pressable>
                    ))}
                  </VStack>
                </VStack>
              </Card>
            </Animated.View>
          )}

          {/* Guided Prayer */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Card style={{ borderRadius: borderRadius.xl, ...shadows.md }}>
              <VStack space="md" className="p-5">
                <HStack space="sm" className="items-center">
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.purple[50] }}
                  >
                    <Heart size={20} color={colors.purple[500]} />
                  </View>
                  <VStack className="flex-1">
                    <Heading size="sm" className="text-gray-900">
                      {language === 'en' ? 'Guided Prayer' : 'Panduan Berdoa'}
                    </Heading>
                    <Text size="xs" className="text-gray-500">
                      {language === 'en'
                        ? 'Let us pray together with you'
                        : 'Mari berdoa bersama Anda'}
                    </Text>
                  </VStack>
                </HStack>

                {!showGuidedPrayer ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onPress={handleGetGuidedPrayer}
                    disabled={isLoadingPrayer || !resources?.themes?.length}
                    style={{ borderColor: colors.purple[300], borderRadius: borderRadius.lg }}
                  >
                    {isLoadingPrayer ? (
                      <HStack space="sm" className="items-center">
                        <ActivityIndicator size="small" color={colors.purple[500]} />
                        <ButtonText style={{ color: colors.purple[600] }}>
                          {language === 'en' ? 'Preparing...' : 'Menyiapkan...'}
                        </ButtonText>
                      </HStack>
                    ) : (
                      <ButtonText style={{ color: colors.purple[600] }}>
                        {language === 'en' ? 'Get Guided Prayer' : 'Dapatkan Panduan Doa'}
                      </ButtonText>
                    )}
                  </Button>
                ) : (
                  <View
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: colors.purple[50] }}
                  >
                    <Text
                      className="text-gray-800 leading-relaxed"
                      size="md"
                      style={{ fontStyle: 'italic' }}
                    >
                      {guidedPrayer}
                    </Text>
                  </View>
                )}
              </VStack>
            </Card>
          </Animated.View>

          {/* Talk to Faith Assistant */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <Pressable onPress={handleTalkToCompanion} className="active:opacity-90">
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: borderRadius.xl, ...shadows.md }}
              >
                <HStack space="md" className="p-5 items-center">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <MessageCircle size={24} color="#FFFFFF" />
                  </View>
                  <VStack className="flex-1">
                    <Text className="text-white font-semibold" size="lg">
                      {language === 'en' ? 'Talk to Faith Assistant' : 'Bicara dengan Pendamping Iman'}
                    </Text>
                    <Text className="text-white/80" size="sm">
                      {language === 'en'
                        ? 'Get personal spiritual guidance'
                        : 'Dapatkan panduan rohani personal'}
                    </Text>
                  </VStack>
                  <ChevronRight size={24} color="#FFFFFF" />
                </HStack>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* Encouragement */}
          <Animated.View entering={FadeInDown.delay(500).duration(400)}>
            <View
              className="p-5 rounded-xl"
              style={{ backgroundColor: colors.amber[50], borderColor: colors.amber[200], borderWidth: 1 }}
            >
              <Text className="text-amber-800 text-center leading-relaxed" size="md">
                {language === 'en'
                  ? '"Cast all your anxiety on Him because He cares for you." — 1 Peter 5:7'
                  : '"Serahkanlah segala kekuatiranmu kepada-Nya, sebab Ia yang memelihara kamu." — 1 Petrus 5:7'}
              </Text>
            </View>
          </Animated.View>

          {/* Home Button */}
          <Animated.View entering={FadeInDown.delay(600).duration(400)}>
            <Button
              size="lg"
              onPress={handleGoHome}
              style={{
                backgroundColor: colors.gray[900],
                borderRadius: borderRadius.lg,
              }}
            >
              <ButtonIcon as={Home} className="mr-2" />
              <ButtonText>
                {language === 'en' ? 'Return Home' : 'Kembali ke Beranda'}
              </ButtonText>
            </Button>
          </Animated.View>
        </VStack>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
