import { View, Text } from "react-native";

export default function GiveScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-backgroundDark">
      <Text className="text-2xl font-bold text-primary">Give</Text>
      <Text className="mt-4 text-text dark:text-textDark">
        Giving module with iPaymu payment gateway will be implemented here
      </Text>
    </View>
  );
}
