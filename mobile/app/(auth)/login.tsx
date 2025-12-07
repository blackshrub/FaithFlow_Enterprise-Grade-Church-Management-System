/**
 * Login Screen - World-Class Premium Design
 *
 * A sophisticated, elegant login experience featuring:
 * - Animated gradient backgrounds
 * - Premium glass morphism effects
 * - Smooth entrance animations
 * - Biometric authentication support
 * - WhatsApp OTP login flow
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StyleProp,
  ViewStyle,
} from "react-native";

// Replacement for StyleSheet.absoluteFill using inline style
const absoluteFillStyle: StyleProp<ViewStyle> = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};
import { useRouter } from "expo-router";
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
  ZoomIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Fingerprint, Scan, Sparkles, BookOpen, Users, Heart, ChevronRight, Calendar, Gift, Compass, Bot, MoreHorizontal } from 'lucide-react-native';

import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { useSendOTP } from "@/hooks/useAuth";
import { useAuthStore } from "@/stores/auth";
import { getErrorMessage } from "@/utils/errorHelpers";
import { useBiometricAuthStore, useBiometricName, useBiometricAvailable } from "@/stores/biometricAuth";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Premium color palette
const COLORS = {
  // Primary gradient - Deep indigo to violet
  gradientStart: '#4338CA',
  gradientMid: '#6366F1',
  gradientEnd: '#8B5CF6',

  // Accent
  accent: '#A78BFA',
  accentLight: '#C4B5FD',

  // Glass effects
  glassWhite: 'rgba(255, 255, 255, 0.15)',
  glassBorder: 'rgba(255, 255, 255, 0.25)',

  // Text
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textWhite: '#FFFFFF',
  textWhiteMuted: 'rgba(255, 255, 255, 0.8)',

  // Surface
  surface: '#FFFFFF',
  surfaceLight: '#F9FAFB',
};

// Animated background orb
function FloatingOrb({ delay = 0, size = 200, top, left, opacity = 0.15 }: {
  delay?: number;
  size?: number;
  top?: string | number;
  left?: string | number;
  opacity?: number;
}) {
  const animation = useSharedValue(0);

  useEffect(() => {
    animation.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(animation.value, [0, 1], [-20, 20]) },
      { scale: interpolate(animation.value, [0, 1], [1, 1.1]) },
    ],
  }));

  return (
    <Animated.View
      className="absolute"
      style={[
        {
          top,
          left,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `rgba(255, 255, 255, ${opacity})`,
        },
        animatedStyle,
      ]}
    />
  );
}

// Feature highlight badge - compact for horizontal scrolling
function FeatureBadge({ icon: Icon, label, delay }: {
  icon: React.ElementType;
  label: string;
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInUp.delay(delay).duration(400).springify()}
      className="items-center w-[76px]"
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mb-1.5"
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        }}
      >
        <Icon size={18} color={COLORS.textWhite} strokeWidth={1.5} />
      </View>
      <Text
        className="text-[10px] font-semibold text-center"
        style={{ color: COLORS.textWhiteMuted }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const { loginDemo, isAuthenticated } = useAuthStore();

  const sendOTP = useSendOTP();

  // Biometric auth
  const biometricName = useBiometricName();
  const biometricAvailable = useBiometricAvailable();
  const {
    isEnabled: biometricEnabled,
    biometricTypes,
    authenticate,
    checkHardwareSupport,
  } = useBiometricAuthStore();

  // Check biometric support on mount
  useEffect(() => {
    checkHardwareSupport();
  }, [checkHardwareSupport]);

  // Auto-prompt biometric if enabled
  useEffect(() => {
    if (biometricEnabled && biometricAvailable && !isAuthenticated) {
      handleBiometricLogin();
    }
  }, [biometricEnabled, biometricAvailable]);

  // Get biometric icon
  const BiometricIcon = biometricTypes.includes('facial') ? Scan : Fingerprint;

  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    try {
      const success = await authenticate('Login with ' + biometricName);
      if (success) {
        router.replace("/(tabs)");
      }
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const validatePhone = (): boolean => {
    if (!phone) {
      setPhoneError("Phone number is required");
      return false;
    }
    if (phone.length < 9 || phone.length > 13) {
      setPhoneError("Invalid phone number");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handleSendOTP = async () => {
    if (!validatePhone()) return;

    try {
      router.push({
        pathname: "/(auth)/select-church",
        params: { phone: `+62${phone}` },
      });
    } catch (error: unknown) {
      setPhoneError(getErrorMessage(error, "Failed to send OTP"));
    }
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      await loginDemo();
      router.replace("/(tabs)");
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <View className="flex-1">
      {/* Animated Gradient Background */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientMid, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={absoluteFillStyle}
      />

      {/* Floating Orbs for depth */}
      <FloatingOrb top={-80} left={SCREEN_WIDTH * 0.6} size={280} opacity={0.08} />
      <FloatingOrb top={SCREEN_HEIGHT * 0.2} left={-60} size={200} opacity={0.1} />
      <FloatingOrb top={SCREEN_HEIGHT * 0.5} left={SCREEN_WIDTH * 0.7} size={150} opacity={0.06} />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Hero Section */}
            <Animated.View
              entering={FadeIn.duration(800)}
              className="items-center pt-8 px-6"
            >
              {/* Logo with premium glow */}
              <Animated.View
                entering={ZoomIn.delay(200).springify()}
                className="relative mb-6"
              >
                {/* Outer glow */}
                <View
                  className="absolute rounded-[40px]"
                  style={{
                    top: -16,
                    left: -16,
                    right: -16,
                    bottom: -16,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                />
                {/* Inner container with glass effect */}
                <View
                  className="w-[88px] h-[88px] rounded-3xl p-1"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    borderWidth: 1.5,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  }}
                >
                  <Image
                    source={require("@/assets/icon.png")}
                    className="w-full h-full rounded-[20px]"
                    contentFit="contain"
                  />
                </View>
              </Animated.View>

              {/* App Title */}
              <Animated.View entering={FadeInDown.delay(300).duration(600)}>
                <Text
                  className="text-4xl font-bold text-center"
                  style={{ color: COLORS.textWhite, letterSpacing: -0.5 }}
                >
                  FaithFlow
                </Text>
                <Text
                  className="text-base text-center mt-1.5"
                  style={{ color: COLORS.textWhiteMuted }}
                >
                  Your spiritual journey, elevated
                </Text>
              </Animated.View>

              {/* Feature Badges - Two rows */}
              <View className="mt-6 mb-2 gap-3">
                <View className="flex-row justify-center gap-2 flex-wrap">
                  <FeatureBadge icon={BookOpen} label="Read Bible" delay={400} />
                  <FeatureBadge icon={Users} label="Join Community" delay={450} />
                  <FeatureBadge icon={Calendar} label="Attend Events" delay={500} />
                  <FeatureBadge icon={Gift} label="Give Faithfully" delay={550} />
                </View>
                <View className="flex-row justify-center gap-2 flex-wrap">
                  <FeatureBadge icon={Heart} label="Join in Prayer" delay={600} />
                  <FeatureBadge icon={Compass} label="Explore Faith" delay={650} />
                  <FeatureBadge icon={Bot} label="Faith Assistant" delay={700} />
                  <FeatureBadge icon={MoreHorizontal} label="And more..." delay={750} />
                </View>
              </View>
            </Animated.View>

            {/* Login Card with Glass Morphism */}
            <Animated.View
              entering={FadeInUp.duration(700).delay(400)}
              className="px-5 pt-5"
            >
              <View
                className="bg-white rounded-[28px] p-6"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 20 },
                  shadowOpacity: 0.15,
                  shadowRadius: 40,
                  elevation: 20,
                }}
              >
                {/* Card Header */}
                <View className="items-center mb-6">
                  <Text
                    className="text-2xl font-bold mb-1"
                    style={{ color: COLORS.textPrimary, letterSpacing: -0.3 }}
                  >
                    Welcome Back
                  </Text>
                  <Text className="text-sm text-center" style={{ color: COLORS.textSecondary }}>
                    Sign in with your WhatsApp number
                  </Text>
                </View>

                {/* Phone Input */}
                <View className="mb-4">
                  <PhoneInput
                    value={phone}
                    onChangeText={setPhone}
                    error={phoneError}
                    placeholder="8123456789"
                    disabled={sendOTP.isPending}
                  />
                </View>

                {/* Primary CTA - WhatsApp Login - Using Gluestack Button with gradient */}
                <View className="rounded-2xl overflow-hidden">
                  <Button
                    size="lg"
                    onPress={handleSendOTP}
                    isDisabled={sendOTP.isPending || !phone}
                    className="w-full bg-transparent relative overflow-hidden"
                  >
                    {/* Gradient background - absolute positioned */}
                    <LinearGradient
                      colors={[COLORS.gradientStart, COLORS.gradientMid]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={absoluteFillStyle}
                    />
                    {/* Content */}
                    <View className="flex-row items-center justify-center gap-2.5 z-[1]">
                      {sendOTP.isPending ? (
                        <ButtonSpinner color={COLORS.textWhite} />
                      ) : (
                        <Ionicons name="logo-whatsapp" size={22} color={COLORS.textWhite} />
                      )}
                      <ButtonText className="text-white font-semibold">
                        {sendOTP.isPending ? 'Sending...' : 'Continue with WhatsApp'}
                      </ButtonText>
                    </View>
                    {/* Chevron positioned at right edge */}
                    {!sendOTP.isPending && (
                      <View className="absolute right-4 z-[1]">
                        <ChevronRight size={20} color={COLORS.textWhite} strokeWidth={2.5} />
                      </View>
                    )}
                  </Button>
                </View>

                {/* Biometric Login Option */}
                {biometricEnabled && biometricAvailable && (
                  <Animated.View entering={FadeIn.delay(500)}>
                    <View className="flex-row items-center my-5">
                      <View className="flex-1 h-px bg-gray-200" />
                      <Text className="text-xs px-3 uppercase tracking-wider font-medium" style={{ color: COLORS.textSecondary }}>
                        quick access
                      </Text>
                      <View className="flex-1 h-px bg-gray-200" />
                    </View>

                    <Button
                      size="lg"
                      variant="outline"
                      onPress={handleBiometricLogin}
                      isDisabled={isBiometricLoading}
                      className="w-full border-gray-200 bg-gray-50"
                    >
                      {isBiometricLoading ? (
                        <ButtonSpinner color={COLORS.gradientMid} />
                      ) : (
                        <BiometricIcon size={24} color={COLORS.gradientMid} strokeWidth={1.5} />
                      )}
                      <ButtonText style={{ color: COLORS.gradientMid }}>
                        {isBiometricLoading ? 'Authenticating...' : `Sign in with ${biometricName}`}
                      </ButtonText>
                    </Button>
                  </Animated.View>
                )}

                {/* Demo Mode Divider */}
                <View className="flex-row items-center my-5">
                  <View className="flex-1 h-px bg-gray-200" />
                  <Text className="text-xs px-3 uppercase tracking-wider font-medium" style={{ color: COLORS.textSecondary }}>
                    or explore
                  </Text>
                  <View className="flex-1 h-px bg-gray-200" />
                </View>

                {/* Demo Button - Using Gluestack Button */}
                <Button
                  size="lg"
                  variant="outline"
                  onPress={handleDemoLogin}
                  isDisabled={isDemoLoading}
                  className="w-full border-gray-200 bg-white"
                >
                  {isDemoLoading ? (
                    <ButtonSpinner color={COLORS.textSecondary} />
                  ) : (
                    <Ionicons name="play-circle-outline" size={22} color={COLORS.textSecondary} />
                  )}
                  <ButtonText style={{ color: COLORS.textSecondary }}>
                    {isDemoLoading ? 'Loading...' : 'Try Demo Mode'}
                  </ButtonText>
                </Button>

                {/* Terms */}
                <Text className="text-[11px] text-center mt-5 leading-4" style={{ color: COLORS.textSecondary }}>
                  By continuing, you agree to our{' '}
                  <Text className="font-medium" style={{ color: COLORS.gradientMid }}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text className="font-medium" style={{ color: COLORS.gradientMid }}>Privacy Policy</Text>
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
