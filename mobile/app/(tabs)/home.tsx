import { View, Text, ScrollView } from "react-native";

export default function HomeScreen() {
  return (
    <ScrollView className="flex-1 bg-white dark:bg-backgroundDark">
      <View className="p-6">
        <Text className="text-3xl font-bold text-text dark:text-textDark mb-4">
          Welcome to FaithFlow
        </Text>
        <Text className="text-base text-text dark:text-textDark">
          Dashboard with quick access cards will be implemented here.
        </Text>
      </View>
    </ScrollView>
  );
}
