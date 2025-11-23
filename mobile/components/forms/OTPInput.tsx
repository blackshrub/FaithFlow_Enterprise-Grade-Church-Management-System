import React, { useRef, useState } from "react";
import { TextInput } from "react-native";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

interface OTPInputProps {
  value: string;
  onChangeText: (text: string) => void;
  length?: number;
  error?: string;
  disabled?: boolean;
}

export function OTPInput({
  value,
  onChangeText,
  length = 6,
  error,
  disabled = false,
}: OTPInputProps) {
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleChange = (text: string, index: number) => {
    const newValue = value.split("");
    newValue[index] = text;
    const otpValue = newValue.join("");

    onChangeText(otpValue);

    // Auto-focus next input
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <VStack space="md">
      <HStack space="sm" className="justify-center">
        {Array.from({ length }).map((_, index) => (
          <Input
            key={index}
            variant="outline"
            size="xl"
            isDisabled={disabled}
            isInvalid={!!error}
            className="w-14 h-14"
          >
            <InputField
              ref={(ref) => (inputRefs.current[index] = ref)}
              value={value[index] || ""}
              onChangeText={(text) => handleChange(text, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              onFocus={() => setFocusedIndex(index)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              className="text-2xl font-bold"
              autoComplete="sms-otp"
              textContentType="oneTimeCode"
            />
          </Input>
        ))}
      </HStack>
      {error && (
        <Text size="sm" className="text-error-500 text-center">
          {error}
        </Text>
      )}
    </VStack>
  );
}
