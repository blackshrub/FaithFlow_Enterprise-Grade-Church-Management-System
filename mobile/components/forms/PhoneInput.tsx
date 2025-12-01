import React from "react";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

interface PhoneInputProps {
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function PhoneInput({
  value,
  onChangeText,
  error,
  placeholder = "812 3456 7890",
  disabled = false,
}: PhoneInputProps) {
  const handleChange = (text: string) => {
    // Remove any non-digit characters
    const cleaned = text.replace(/\D/g, "");
    onChangeText(cleaned);
  };

  return (
    <VStack space="xs">
      <Input
        variant="outline"
        size="xl"
        isDisabled={disabled}
        isInvalid={!!error}
        className="h-14 rounded-xl border-outline-200 bg-background-50"
      >
        <InputSlot className="pl-4">
          <Text className="text-[18px] font-medium text-typography-700">+62</Text>
        </InputSlot>
        <InputField
          placeholder={placeholder}
          keyboardType="phone-pad"
          value={value}
          onChangeText={handleChange}
          maxLength={13}
          autoComplete="tel"
          textContentType="telephoneNumber"
          className="text-[18px] pl-2"
        />
      </Input>
      {error && (
        <Text size="sm" className="text-error-500 ml-1">
          {error}
        </Text>
      )}
    </VStack>
  );
}
