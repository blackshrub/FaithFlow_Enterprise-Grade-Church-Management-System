/**
 * Event Detail Screen - World-Class UI/UX
 * Premium Motion V10 Ultra Edition
 *
 * Premium features:
 * - Parallax hero header with gradient
 * - Floating back & share buttons
 * - Sticky bottom RSVP button
 * - Beautiful information cards with icon backgrounds
 * - QR code display for confirmed RSVPs
 * - Series sessions list
 * - Smooth scroll animations
 * - Professional typography & spacing
 * - V10 Ultra Motion System
 */

import React, { useRef } from 'react';
import {
  View,
  Pressable,
  Share,
  Alert,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import AnimatedReanimated, { Layout } from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Users,
  Check,
  X,
  Share2,
  Clock,
  Tag,
  ChevronRight,
  Info,
  QrCode,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import QRCodeSVG from 'react-native-qrcode-svg';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { PremiumCard2 } from '@/components/ui/premium-card';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button, ButtonText } from '@/components/ui/button';

import { useEvent, useRSVP, useCancelRSVP } from '@/hooks/useEvents';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
// Use 2:1 aspect ratio for event cover images (consistent with list view)
const HEADER_MAX_HEIGHT = SCREEN_WIDTH / 2; // 2:1 aspect ratio
const HEADER_MIN_HEIGHT = 100;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

function EventDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuthStore();

  const { data: event, isLoading, isError, refetch } = useEvent(id);
  const rsvpMutation = useRSVP();
  const cancelRSVPMutation = useCancelRSVP();

  const scrollY = useRef(new Animated.Value(0)).current;

  // Parallax scroll animations
  const headerHeight = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [1, 0.5, 0],
    extrapolate: 'clamp',
  });

  const titleOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE / 2, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const handleRSVP = () => {
    if (!member?.id || !event) {
      Alert.alert(t('common.error'), 'Member ID not available');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rsvpMutation.mutate(
      { eventId: event.id, member_id: member.id },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            t('common.success'),
            t('events.rsvpSuccess'),
            [{ text: t('common.ok'), style: 'default' }]
          );
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('common.error'), t('events.rsvpError'));
        },
      }
    );
  };

  const handleCancelRSVP = () => {
    if (!event) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t('events.cancelRSVPTitle'), t('events.cancelRSVPMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: () => {
          cancelRSVPMutation.mutate(
            { eventId: event.id },
            {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              },
              onError: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(t('common.error'), t('events.cancelError'));
              },
            }
          );
        },
      },
    ]);
  };

  const handleShare = async () => {
    if (!event) return;

    try {
      const eventDate = event.event_date
        ? new Date(event.event_date).toLocaleDateString()
        : '';
      await Share.share({
        message: `${event.name}\n${eventDate}\n${event.location || ''}\n\n${event.description || ''}`,
        title: event.name,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getEventTypeGradient = (eventType?: 'single' | 'series'): [string, string] => {
    return eventType === 'series'
      ? ['#8B5CF6', '#6366F1']
      : ['#3B82F6', '#2563EB'];
  };

  // Loading state
  if (isLoading || !event) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="px-6 py-6">
          <Skeleton className="h-64 w-full rounded-3xl mb-6" isLoaded={false} />
          <Skeleton className="h-8 w-3/4 mb-4" isLoaded={false} />
          <Skeleton className="h-4 w-1/2 mb-6" isLoaded={false} />
          <Skeleton className="h-32 w-full rounded-2xl mb-4" isLoaded={false} />
          <Skeleton className="h-32 w-full rounded-2xl" isLoaded={false} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: colors.error[50] }}
          >
            <Icon as={Calendar} size="2xl" className="text-error-500" />
          </View>
          <Heading size="xl" className="text-gray-900 mb-3 text-center font-bold">
            {t('events.loadError')}
          </Heading>
          <Text className="text-gray-500 text-center mb-8 text-base">
            {t('events.loadErrorDesc')}
          </Text>
          <Button onPress={() => refetch()} size="lg" className="px-8">
            <ButtonText className="font-semibold">{t('common.retry')}</ButtonText>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const [gradientStart, gradientEnd] = getEventTypeGradient(event.event_type as 'single' | 'series' | undefined);
  const hasRSVP = !!event.my_rsvp;
  const hasAttended = !!event.my_attendance;
  const canRSVP = event.requires_rsvp && event.can_rsvp && !hasRSVP && !hasAttended;
  // Extract EventRSVP object if my_rsvp is not a boolean
  const rsvpData = typeof event.my_rsvp === 'object' ? event.my_rsvp : undefined;

  // Section stagger counter for V10 Ultra animations
  let sectionIndex = 0;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Parallax Hero Header */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: headerHeight,
          zIndex: 10,
          overflow: 'hidden',
        }}
      >
        {/* Event Photo Background */}
        {event.event_photo ? (
          <Image
            source={{ uri: event.event_photo }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
            contentFit="cover"
          />
        ) : null}

        <LinearGradient
          colors={
            event.event_photo
              ? ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']
              : [gradientStart, gradientEnd]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: event.event_photo ? 0 : 1, y: 1 }}
          style={{ flex: 1 }}
        >
          <Animated.View
            style={{
              flex: 1,
              opacity: headerOpacity,
              justifyContent: 'flex-end',
              padding: spacing.lg,
            }}
          >
            <Badge
              variant="solid"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                alignSelf: 'flex-start',
                marginBottom: spacing.md,
              }}
            >
              <BadgeText className="text-white text-xs font-bold uppercase">
                {event.event_type === 'series' ? t('events.series') : t('events.single')}
              </BadgeText>
            </Badge>

            <Heading size="2xl" className="text-white font-bold mb-2">
              {event.name}
            </Heading>

            {event.event_date && (
              <HStack space="sm" className="items-center">
                <Icon as={Calendar} size="sm" className="text-white" />
                <Text className="text-white text-sm font-medium">
                  {formatDate(event.event_date)}
                </Text>
              </HStack>
            )}
          </Animated.View>

          {/* Collapsed title */}
          <Animated.View
            style={{
              position: 'absolute',
              top: Platform.OS === 'ios' ? 50 : 20,
              left: 60,
              right: 60,
              opacity: titleOpacity,
              alignItems: 'center',
            }}
          >
            <Text className="text-white font-bold text-base" numberOfLines={1}>
              {event.name}
            </Text>
          </Animated.View>
        </LinearGradient>
      </Animated.View>

      {/* Floating Back Button */}
      <SafeAreaView
        edges={['top']}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 20 }}
      >
        <AnimatedReanimated.View
          entering={PMotionV10.sharedAxisYEnter}
          exiting={PMotionV10.sharedAxisYExit}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="active:scale-95 active:opacity-90"
            style={{
              margin: spacing.lg,
              width: 40,
              height: 40,
              borderRadius: borderRadius.full,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon as={ArrowLeft} size="lg" className="text-white" />
          </Pressable>
        </AnimatedReanimated.View>
      </SafeAreaView>

      {/* Floating Share Button */}
      <SafeAreaView
        edges={['top']}
        style={{ position: 'absolute', top: 0, right: 0, zIndex: 20 }}
      >
        <AnimatedReanimated.View
          entering={PMotionV10.sharedAxisYEnter}
          exiting={PMotionV10.sharedAxisYExit}
        >
          <Pressable
            onPress={handleShare}
            className="active:scale-95 active:opacity-90"
            style={{
              margin: spacing.lg,
              width: 40,
              height: 40,
              borderRadius: borderRadius.full,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon as={Share2} size="lg" className="text-white" />
          </Pressable>
        </AnimatedReanimated.View>
      </SafeAreaView>

      {/* Scrollable Content */}
      <Animated.ScrollView
        contentContainerStyle={{
          paddingTop: HEADER_MAX_HEIGHT - 10,
          paddingBottom: 80,
        }}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="bg-white rounded-t-3xl px-6 pt-8"
          style={{ ...shadows.lg, minHeight: SCREEN_HEIGHT - HEADER_MAX_HEIGHT }}
        >
          <VStack space="xl">
            {/* Status Badges - layout animation only, no nested entering to avoid opacity conflict */}
            {(hasRSVP || hasAttended) && (
              <AnimatedReanimated.View layout={Layout.springify()}>
                <HStack space="sm">
                  {hasAttended && (
                    <Badge variant="solid" style={{ backgroundColor: colors.success[500] }}>
                      <Icon as={Check} size="xs" className="text-white mr-1" />
                      <BadgeText className="text-white font-bold">
                        {t('events.attended')}
                      </BadgeText>
                    </Badge>
                  )}
                  {hasRSVP && !hasAttended && (
                    <Badge variant="solid" style={{ backgroundColor: colors.primary[500] }}>
                      <Icon as={Check} size="xs" className="text-white mr-1" />
                      <BadgeText className="text-white font-bold">
                        {t('events.rsvpConfirmed')}
                      </BadgeText>
                    </Badge>
                  )}
                </HStack>
              </AnimatedReanimated.View>
            )}

            {/* About Section - layout animation only */}
            {event.description && (
              <AnimatedReanimated.View layout={Layout.springify()}>
                <PremiumCard2>
                <HStack space="sm" className="items-center mb-3">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: colors.primary[50] }}
                  >
                    <Icon as={Info} size="md" className="text-primary-600" />
                  </View>
                  <Heading size="lg" className="text-gray-900 font-bold">
                    {t('events.about')}
                  </Heading>
                </HStack>
                <Text className="text-gray-700 text-base leading-6">
                  {event.description}
                </Text>
                </PremiumCard2>
              </AnimatedReanimated.View>
            )}

            {/* When & Where Section - layout animation only */}
            <AnimatedReanimated.View layout={Layout.springify()}>
              <PremiumCard2>
              <VStack space="lg">
                {event.event_date && (
                  <HStack space="sm">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: colors.primary[50] }}
                    >
                      <Icon as={Clock} size="md" className="text-primary-600" />
                    </View>
                    <VStack className="flex-1">
                      <Text className="text-gray-500 text-xs font-medium uppercase mb-1">
                        {t('events.when')}
                      </Text>
                      <Text className="text-gray-900 font-bold text-base">
                        {formatDate(event.event_date)}
                      </Text>
                      <Text className="text-gray-600 text-sm">
                        {formatTime(event.event_date)}
                        {event.event_end_date && ` - ${formatTime(event.event_end_date)}`}
                      </Text>
                    </VStack>
                  </HStack>
                )}

                {event.location && (
                  <HStack space="sm">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: colors.primary[50] }}
                    >
                      <Icon as={MapPin} size="md" className="text-primary-600" />
                    </View>
                    <VStack className="flex-1">
                      <Text className="text-gray-500 text-xs font-medium uppercase mb-1">
                        {t('events.where')}
                      </Text>
                      <Text className="text-gray-900 font-bold text-base">
                        {event.location}
                      </Text>
                    </VStack>
                  </HStack>
                )}

                {event.requires_rsvp && (
                  <HStack space="sm">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: colors.primary[50] }}
                    >
                      <Icon as={Users} size="md" className="text-primary-600" />
                    </View>
                    <VStack className="flex-1">
                      <Text className="text-gray-500 text-xs font-medium uppercase mb-1">
                        {t('events.capacity')}
                      </Text>
                      <Text className="text-gray-900 font-bold text-base">
                        {event.total_rsvps}
                        {event.seat_capacity && ` / ${event.seat_capacity}`} {t('events.registered')}
                      </Text>
                      {event.available_seats !== undefined && event.available_seats > 0 && (
                        <Text className="text-success-600 text-sm font-medium mt-1">
                          {event.available_seats} {t('events.seatsLeft')}
                        </Text>
                      )}
                    </VStack>
                  </HStack>
                )}
              </VStack>
              </PremiumCard2>
            </AnimatedReanimated.View>

            {/* Series Sessions - layout animation only */}
            {event.event_type === 'series' && (event.sessions?.length ?? 0) > 0 && (
              <AnimatedReanimated.View layout={Layout.springify()}>
                <PremiumCard2>
                <HStack space="sm" className="items-center mb-4">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: colors.secondary[50] }}
                  >
                    <Icon as={Tag} size="md" className="text-secondary-600" />
                  </View>
                  <Heading size="lg" className="text-gray-900 font-bold">
                    {t('events.sessions')} ({event.sessions?.length ?? 0})
                  </Heading>
                </HStack>

                <VStack space="sm">
                  {event.sessions?.map((session, index) => (
                    <View
                      key={index}
                      className="p-4 rounded-xl border border-gray-200"
                    >
                      <Text className="text-gray-900 font-bold text-base mb-1">
                        {session.name}
                      </Text>
                      <Text className="text-gray-600 text-sm">
                        {formatDate(session.date)}
                        {session.end_date && ` - ${formatDate(session.end_date)}`}
                      </Text>
                    </View>
                  ))}
                </VStack>
                </PremiumCard2>
              </AnimatedReanimated.View>
            )}

            {/* QR Code - Only if RSVP'd - layout animation only */}
            {hasRSVP && rsvpData?.qr_data && (
              <AnimatedReanimated.View layout={Layout.springify()}>
                <PremiumCard2 innerStyle={{ alignItems: 'center' }}>
                <HStack space="sm" className="items-center mb-4">
                  <Icon as={QrCode} size="md" className="text-primary-600" />
                  <Heading size="lg" className="text-gray-900 font-bold">
                    {t('events.yourTicket')}
                  </Heading>
                </HStack>

                <View className="p-6 bg-white rounded-2xl" style={shadows.md}>
                  <QRCodeSVG value={rsvpData.qr_data} size={200} />
                </View>

                <Text className="text-gray-500 text-sm mt-4 text-center">
                  {t('events.confirmationCode')}: {rsvpData.confirmation_code}
                </Text>
                </PremiumCard2>
              </AnimatedReanimated.View>
            )}
          </VStack>
        </View>
      </Animated.ScrollView>

      {/* Sticky Bottom Button */}
      {(canRSVP || hasRSVP) && !hasAttended && (
        <AnimatedReanimated.View
          entering={PMotionV10.sharedAxisYEnter}
          exiting={PMotionV10.sharedAxisYExit}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}
        >
          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: '#FFFFFF',
              ...shadows.lg,
            }}
          >
            <View className="px-6 py-4">
              {canRSVP && (
                <Button
                  onPress={handleRSVP}
                  disabled={rsvpMutation.isPending}
                  size="xl"
                  variant="solid"
                  className="active:scale-95 active:opacity-90"
                >
                  <Icon as={Check} size="md" className="text-white mr-2" />
                  <ButtonText className="font-bold text-lg">{t('events.rsvpNow')}</ButtonText>
                  <Icon as={ChevronRight} size="md" className="text-white ml-1" />
                </Button>
              )}

              {hasRSVP && !hasAttended && (
                <Button
                  onPress={handleCancelRSVP}
                  disabled={cancelRSVPMutation.isPending}
                  size="xl"
                  variant="outline"
                  action="negative"
                  className="active:scale-95 active:opacity-90"
                >
                  <Icon as={X} size="md" className="text-error-600 mr-2" />
                  <ButtonText className="font-bold text-lg">{t('events.cancelRSVP')}</ButtonText>
                </Button>
              )}
            </View>
          </SafeAreaView>
        </AnimatedReanimated.View>
      )}
    </View>
  );
}

// Apply Premium Motion V10 Ultra HOC for production-grade transitions
export default withPremiumMotionV10(EventDetailScreen);
