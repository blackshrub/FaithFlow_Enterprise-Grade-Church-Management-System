import React, { useState, useEffect } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Pressable } from "@/components/ui/pressable";
import { OTPInput } from "@/components/forms/OTPInput";
import { useSendOTP, useVerifyOTP } from "@/hooks/useAuth";

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string; church_id: string }>();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(300); // 5 minutes

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
    if (otp.length !== 6) {
      setError("Kode OTP harus 6 digit");
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
      router.replace("/(tabs)/home");
    } catch (error: any) {
      setError(error.response?.data?.detail || "Kode OTP tidak valid");
      setOtp("");
    }
  };

  const handleResendOTP = async () => {
    try {
      await sendOTP.mutateAsync({
        phone: params.phone || "",
        church_id: params.church_id || "",
      });

      setCountdown(300); // Reset countdown
      setError("");
      setOtp("");
      // TODO: Show success toast
    } catch (error: any) {
      setError(error.response?.data?.detail || "Gagal mengirim ulang OTP");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      <MotiView
        from={{ opacity: 0, translateY: 30 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 400 }}
        className="flex-1 px-6 justify-center"
      >
        <VStack space="2xl" className="items-center">
          {/* Header */}
          <VStack space="md" className="items-center">
            <Heading size="xl" className="text-center">
              Verifikasi OTP
            </Heading>
            <Text size="md" className="text-center text-typography-500">
              Masukkan kode 6 digit yang dikirim ke
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
              length={6}
              error={error}
              disabled={verifyOTP.isPending}
            />

            <Button
              size="lg"
              onPress={handleVerifyOTP}
              isDisabled={verifyOTP.isPending || otp.length !== 6}
              className="w-full"
            >
              {verifyOTP.isPending && <ButtonSpinner className="mr-2" />}
              <ButtonText>
                {verifyOTP.isPending ? "Memverifikasi..." : "Verifikasi"}
              </ButtonText>
            </Button>
          </VStack>

          {/* Resend OTP */}
          <VStack space="md" className="items-center">
            <Text size="sm" className="text-typography-400">
              Kode akan kadaluarsa dalam {formatTime(countdown)}
            </Text>

            {countdown > 0 ? (
              <Text size="sm" className="text-typography-400">
                Tidak menerima kode?{" "}
                <Text className="text-typography-400">
                  Tunggu {formatTime(countdown)}
                </Text>
              </Text>
            ) : (
              <Pressable
                onPress={handleResendOTP}
                disabled={sendOTP.isPending}
              >
                <HStack space="xs" className="items-center">
                  {sendOTP.isPending && <ButtonSpinner size="small" />}
                  <Text size="sm" className="text-primary-500 font-bold">
                    {sendOTP.isPending ? "Mengirim..." : "Kirim Ulang OTP"}
                  </Text>
                </HStack>
              </Pressable>
            )}
          </VStack>

          {/* Back button */}
          <Pressable onPress={() => router.back()}>
            <Text size="sm" className="text-typography-500">
              Ubah nomor telepon
            </Text>
          </Pressable>
        </VStack>
      </MotiView>
    </SafeAreaView>
  );
}
