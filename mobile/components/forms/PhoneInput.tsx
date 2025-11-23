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
  placeholder = "8123456789",
  disabled = false,
}: PhoneInputProps) {
  const handleChange = (text: string) => {
    // Remove any non-digit characters
    const cleaned = text.replace(/\D/g, "");
    onChangeText(cleaned);
  };

  // Format display value with +62 prefix
  const displayValue = value ? `+62${value}` : "";

  return (
    <VStack space="xs">
      <Input
        variant="outline"
        size="lg"
        isDisabled={disabled}
        isInvalid={!!error}
      >
        <InputSlot className="pl-3">
          <Text className="text-typography-500">+62</Text>
        </InputSlot>
        <InputField
          placeholder={placeholder}
          keyboardType="phone-pad"
          value={value}
          onChangeText={handleChange}
          maxLength={13}
          autoComplete="tel"
          textContentType="telephoneNumber"
        />
      </Input>
      {error && (
        <Text size="sm" className="text-error-500">
          {error}
        </Text>
      )}
    </VStack>
  );
}
