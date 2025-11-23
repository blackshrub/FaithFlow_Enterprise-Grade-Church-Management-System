import { View, Text } from "react-native";

export default function LoginScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-backgroundDark">
      <Text className="text-2xl font-bold text-primary">
        Login Screen - Phone + OTP
      </Text>
      <Text className="mt-4 text-text dark:text-textDark">
        Will implement phone number input and OTP verification
      </Text>
    </View>
  );
}
