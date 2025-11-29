import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import Animated, { FadeInUp, FadeInDown, ZoomIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { useSendOTP } from "@/hooks/useAuth";
import { Image } from "@/components/ui/image";
import { useAuthStore } from "@/stores/auth";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Premium color palette
const Colors = {
  gradient: {
    start: '#4F46E5',
    middle: '#6366F1',
    end: '#818CF8',
  },
  white: '#FFFFFF',
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
};

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const { loginDemo } = useAuthStore();

  const sendOTP = useSendOTP();

  const validatePhone = (): boolean => {
    if (!phone) {
      setPhoneError("Nomor telepon harus diisi");
      return false;
    }
    if (phone.length < 9 || phone.length > 13) {
      setPhoneError("Nomor telepon tidak valid");
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
    } catch (error: any) {
      setPhoneError(error.response?.data?.detail || "Gagal mengirim OTP");
    }
  };

  const handleDemoLogin = async () => {
    await loginDemo();
    router.replace("/(tabs)");
  };

  // Feature items to highlight
  const features = [
    { icon: 'book-outline' as const, label: 'Bible' },
    { icon: 'people-outline' as const, label: 'Community' },
    { icon: 'heart-outline' as const, label: 'Prayer' },
  ];

  return (
    <View style={styles.container}>
      {/* Full gradient background */}
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.middle, Colors.gradient.end]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative circles */}
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            {/* Top section with logo and welcome */}
            <Animated.View
              entering={FadeInDown.duration(600).delay(100)}
              style={styles.headerSection}
            >
              {/* Logo with glow effect */}
              <Animated.View
                entering={ZoomIn.delay(200).springify()}
                style={styles.logoContainer}
              >
                <View style={styles.logoGlow} />
                <Image
                  source={require("@/assets/icon.png")}
                  alt="FaithFlow Logo"
                  style={styles.logo}
                />
              </Animated.View>

              <Text style={styles.welcomeTitle}>Welcome to FaithFlow</Text>
              <Text style={styles.welcomeSubtitle}>
                Your spiritual journey companion
              </Text>

              {/* Feature highlights */}
              <View style={styles.featuresRow}>
                {features.map((feature, index) => (
                  <Animated.View
                    key={feature.label}
                    entering={FadeInUp.delay(400 + index * 100).duration(400)}
                    style={styles.featureItem}
                  >
                    <View style={styles.featureIconBg}>
                      <Ionicons name={feature.icon} size={20} color={Colors.white} />
                    </View>
                    <Text style={styles.featureLabel}>{feature.label}</Text>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>

            {/* Bottom section with form card */}
            <Animated.View
              entering={FadeInUp.duration(600).delay(300)}
              style={styles.formSection}
            >
              <View style={styles.formCard}>
                {/* Card header */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Sign In</Text>
                  <Text style={styles.cardSubtitle}>
                    Enter your WhatsApp number to continue
                  </Text>
                </View>

                {/* Phone Input */}
                <View style={styles.inputContainer}>
                  <PhoneInput
                    value={phone}
                    onChangeText={setPhone}
                    error={phoneError}
                    placeholder="8123456789"
                    disabled={sendOTP.isPending}
                  />
                </View>

                {/* Primary Button - Gradient */}
                <Pressable
                  onPress={handleSendOTP}
                  disabled={sendOTP.isPending || !phone}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.buttonPressed,
                    (!phone || sendOTP.isPending) && styles.buttonDisabled,
                  ]}
                >
                  <LinearGradient
                    colors={[Colors.gradient.start, Colors.gradient.middle]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {sendOTP.isPending ? (
                      <Text style={styles.buttonText}>Sending OTP...</Text>
                    ) : (
                      <>
                        <Ionicons name="logo-whatsapp" size={20} color={Colors.white} />
                        <Text style={styles.buttonText}>Continue with WhatsApp</Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                {/* Divider */}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Demo Button */}
                <Pressable
                  onPress={handleDemoLogin}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.secondaryButtonPressed,
                  ]}
                >
                  <Ionicons name="play-circle-outline" size={20} color={Colors.gradient.start} />
                  <Text style={styles.secondaryButtonText}>Try Demo Mode</Text>
                </Pressable>

                {/* Terms text */}
                <Text style={styles.termsText}>
                  By continuing, you agree to our{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gradient.start,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },

  // Decorative elements
  decorativeCircle1: {
    position: 'absolute',
    top: -SCREEN_WIDTH * 0.3,
    right: -SCREEN_WIDTH * 0.2,
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    top: '15%',
    left: -SCREEN_WIDTH * 0.15,
    width: SCREEN_WIDTH * 0.4,
    height: SCREEN_WIDTH * 0.4,
    borderRadius: SCREEN_WIDTH * 0.2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  // Header section
  headerSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  logoGlow: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 18,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 28,
  },

  // Features row
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
  },
  featureItem: {
    alignItems: 'center',
    gap: 6,
  },
  featureIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },

  // Form section
  formSection: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.neutral[500],
    textAlign: 'center',
  },

  // Input
  inputContainer: {
    marginBottom: 16,
  },

  // Buttons
  primaryButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.neutral[200],
  },
  dividerText: {
    fontSize: 12,
    color: Colors.neutral[400],
    paddingHorizontal: 12,
  },

  // Secondary button
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.neutral[200],
    gap: 8,
  },
  secondaryButtonPressed: {
    backgroundColor: Colors.neutral[50],
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gradient.start,
  },

  // Terms
  termsText: {
    fontSize: 11,
    color: Colors.neutral[400],
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 16,
  },
  termsLink: {
    color: Colors.gradient.start,
    fontWeight: '500',
  },
});
