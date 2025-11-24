import React, { useState } from "react";
import { useRouter } from "expo-router";
import { MotiView } from "moti";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { PhoneInput } from "@/components/forms/PhoneInput";
import { useSendOTP } from "@/hooks/useAuth";
import { Image } from "@/components/ui/image";
import { useAuthStore } from "@/stores/auth";

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
      // For now, we'll navigate to church selection since we don't have church_id yet
      // In real flow, this would come from a church selection or stored preference
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

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      <MotiView
        from={{ opacity: 0, translateY: 50 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: "timing", duration: 500 }}
        className="flex-1 px-6 justify-center"
      >
        <VStack space="2xl" className="items-center">
          {/* Logo */}
          <VStack space="md" className="items-center">
            <MotiView
              from={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 200 }}
            >
              <Image
                source={require("@/assets/icon.png")}
                alt="FaithFlow Logo"
                className="w-24 h-24 rounded-2xl"
              />
            </MotiView>
            <Heading size="2xl" className="text-center">
              Selamat Datang
            </Heading>
            <Text size="md" className="text-center text-typography-500">
              Masuk dengan nomor WhatsApp Anda
            </Text>
          </VStack>

          {/* Phone Input */}
          <VStack space="lg" className="w-full">
            <PhoneInput
              value={phone}
              onChangeText={setPhone}
              error={phoneError}
              placeholder="8123456789"
              disabled={sendOTP.isPending}
            />

            <Button
              size="lg"
              onPress={handleSendOTP}
              isDisabled={sendOTP.isPending || !phone}
              className="w-full"
            >
              {sendOTP.isPending && <ButtonSpinner className="mr-2" />}
              <ButtonText>
                {sendOTP.isPending ? "Mengirim OTP..." : "Kirim OTP"}
              </ButtonText>
            </Button>

            {/* Demo Login Button */}
            <Button
              size="lg"
              variant="outline"
              onPress={handleDemoLogin}
              className="w-full"
            >
              <ButtonText>🎭 Demo Login (Skip Auth)</ButtonText>
            </Button>
          </VStack>

          {/* Info Text */}
          <Text size="sm" className="text-center text-typography-400 px-4">
            Kami akan mengirim kode verifikasi ke nomor WhatsApp Anda
          </Text>
        </VStack>
      </MotiView>
    </SafeAreaView>
  );
}
