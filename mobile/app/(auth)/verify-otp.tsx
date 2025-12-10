import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { OTPInput } from "@/components/forms/OTPInput";
import { useSendOTP, useVerifyOTP } from "@/hooks/useAuth";
import { showSuccessToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/utils/errorHelpers";

// Constants - Sync with backend OTP_TTL_SECONDS (3 minutes)
const OTP_EXPIRY_SECONDS = 180; // 3 minutes
const OTP_LENGTH = 6;

export default function VerifyOTPScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; church_id: string }>();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS);

  const sendOTP = useSendOTP();
  const verifyOTP = useVerifyOTP();

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== OTP_LENGTH) {
      setError(t('auth.otpLengthError', { length: OTP_LENGTH }));
      return;
    }

    // SEC FIX: Validate OTP contains only numeric characters
    if (!/^\d+$/.test(otp)) {
      setError(t('auth.otpNumericError', 'OTP must contain only numbers'));
      return;
    }

    try {
      await verifyOTP.mutateAsync({
        phone: params.phone || "",
        church_id: params.church_id || "",
        otp_code: otp,
      });

      // Navigation handled by useVerifyOTP success callback
      // User will be redirected to tabs automatically via index.tsx
      router.replace("/(tabs)");
    } catch (error: unknown) {
      setError(getErrorMessage(error, t('auth.otpInvalid')));
      setOtp("");
    }
  };

  const handleResendOTP = async () => {
    try {
      await sendOTP.mutateAsync({
        phone: params.phone || "",
        church_id: params.church_id || "",
      });

      setCountdown(OTP_EXPIRY_SECONDS);
      setError("");
      setOtp("");
      showSuccessToast(t('auth.otpSent'), t('auth.otpSentDescription'));
    } catch (error: unknown) {
      setError(getErrorMessage(error, t('auth.otpResendFailed')));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      <Animated.View
        entering={FadeInUp.duration(400)}
        className="flex-1 px-6 justify-center"
      >
        <VStack space="2xl" className="items-center">
          {/* Header */}
          <VStack space="md" className="items-center">
            <Heading size="xl" className="text-center">
              {t('auth.verifyOtp')}
            </Heading>
            <Text size="md" className="text-center text-typography-500">
              {t('auth.enterOtpCode', { length: OTP_LENGTH })}
            </Text>
            <Text size="md" className="font-bold">
              {params.phone}
            </Text>
          </VStack>

          {/* OTP Input */}
          <VStack space="lg" className="w-full">
            <OTPInput
              value={otp}
              onChangeText={setOtp}
              length={OTP_LENGTH}
              error={error}
              disabled={verifyOTP.isPending}
            />

            <Button
              size="lg"
              onPress={handleVerifyOTP}
              isDisabled={verifyOTP.isPending || otp.length !== OTP_LENGTH}
              className="w-full"
            >
              {verifyOTP.isPending && <ButtonSpinner className="mr-2" />}
              <ButtonText>
                {verifyOTP.isPending ? t('auth.verifying') : t('auth.verify')}
              </ButtonText>
            </Button>
          </VStack>

          {/* Resend OTP */}
          <VStack space="md" className="items-center">
            <Text size="sm" className="text-typography-400">
              {t('auth.otpExpiresIn', { time: formatTime(countdown) })}
            </Text>

            {countdown > 0 ? (
              <Text size="sm" className="text-typography-400">
                {t('auth.didntReceiveCode')}{" "}
                <Text className="text-typography-400">
                  {t('auth.waitTime', { time: formatTime(countdown) })}
                </Text>
              </Text>
            ) : (
              <Pressable
                onPress={handleResendOTP}
                disabled={sendOTP.isPending}
                accessible
                accessibilityRole="button"
                accessibilityLabel={t('auth.resendOtp')}
              >
                <HStack space="xs" className="items-center">
                  {sendOTP.isPending && <ButtonSpinner size="small" />}
                  <Text size="sm" className="text-primary-500 font-bold">
                    {sendOTP.isPending ? t('auth.sending') : t('auth.resendOtp')}
                  </Text>
                </HStack>
              </Pressable>
            )}
          </VStack>

          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('auth.changePhoneNumber')}
          >
            <Text size="sm" className="text-typography-500">
              {t('auth.changePhoneNumber')}
            </Text>
          </Pressable>
        </VStack>
      </Animated.View>
    </SafeAreaView>
  );
}
