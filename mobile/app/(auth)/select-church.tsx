import React, { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "@/components/ui/safe-area-view";
import { VStack } from "@/components/ui/vstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button as _Button, ButtonText as _ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Pressable } from "@/components/ui/pressable";
import { Search, ChevronRight } from "lucide-react-native";
import { useSendOTP } from "@/hooks/useAuth";
import { showErrorToast } from "@/components/ui/Toast";

// Mock church data - in production, this would come from an API
const MOCK_CHURCHES = [
  { id: "church1", name: "GKI Pondok Indah", location: "Jakarta Selatan" },
  { id: "church2", name: "GKI Kelapa Gading", location: "Jakarta Utara" },
  { id: "church3", name: "GKI Cibubur", location: "Jakarta Timur" },
];

export default function SelectChurchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ phone: string }>();
  const [search, setSearch] = useState("");
  const [selectedChurch, setSelectedChurch] = useState<string | null>(null);

  const sendOTP = useSendOTP();

  const filteredChurches = MOCK_CHURCHES.filter((church) =>
    church.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectChurch = async (churchId: string) => {
    setSelectedChurch(churchId);

    try {
      // Send OTP
      await sendOTP.mutateAsync({
        phone: params.phone || "",
        church_id: churchId,
      });

      // Navigate to OTP verification
      router.push({
        pathname: "/(auth)/verify-otp",
        params: {
          phone: params.phone,
          church_id: churchId,
        },
      });
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      setSelectedChurch(null);
      showErrorToast(
        "Gagal mengirim OTP",
        error.response?.data?.detail || "Silakan coba lagi"
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-0">
      <Animated.View
        entering={FadeInUp.duration(400)}
        className="flex-1 px-6 py-8"
      >
        <VStack space="xl" className="flex-1">
          {/* Header */}
          <VStack space="sm">
            <Heading size="xl">Pilih Gereja</Heading>
            <Text size="sm" className="text-typography-500">
              {params.phone}
            </Text>
          </VStack>

          {/* Search */}
          <Input variant="outline" size="lg">
            <InputSlot className="pl-3">
              <InputIcon as={Search} className="text-typography-400" />
            </InputSlot>
            <InputField
              placeholder="Cari gereja..."
              value={search}
              onChangeText={setSearch}
            />
          </Input>

          {/* Church List */}
          <VStack space="md" className="flex-1">
            {filteredChurches.map((church, index) => (
              <Animated.View
                key={church.id}
                entering={ZoomIn.delay(index * 50).duration(300)}
              >
                <Card
                  size="lg"
                  variant="elevated"
                  className="bg-background-0"
                >
                  <Pressable
                    onPress={() => handleSelectChurch(church.id)}
                    disabled={sendOTP.isPending}
                    className="p-4"
                  >
                    <VStack space="xs" className="flex-row items-center justify-between">
                      <VStack space="xs" className="flex-1">
                        <Heading size="md">{church.name}</Heading>
                        <Text size="sm" className="text-typography-500">
                          {church.location}
                        </Text>
                      </VStack>
                      {sendOTP.isPending && selectedChurch === church.id ? (
                        <ButtonSpinner />
                      ) : (
                        <ChevronRight
                          size={20}
                          className="text-typography-400"
                        />
                      )}
                    </VStack>
                  </Pressable>
                </Card>
              </Animated.View>
            ))}

            {filteredChurches.length === 0 && (
              <VStack space="md" className="items-center py-12">
                <Text size="lg" className="text-typography-400">
                  Gereja tidak ditemukan
                </Text>
                <Text size="sm" className="text-typography-400 text-center">
                  Coba kata kunci lain
                </Text>
              </VStack>
            )}
          </VStack>
        </VStack>
      </Animated.View>
    </SafeAreaView>
  );
}
