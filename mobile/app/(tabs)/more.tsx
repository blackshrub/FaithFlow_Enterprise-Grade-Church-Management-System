import { View, Text, ScrollView } from "react-native";

export default function MoreScreen() {
  return (
    <ScrollView className="flex-1 bg-white dark:bg-backgroundDark">
      <View className="p-6">
        <Text className="text-2xl font-bold text-text dark:text-textDark mb-4">
          More
        </Text>
        <Text className="text-base text-text dark:text-textDark">
          More menu with Profile, Bible, Prayer, Counseling, Settings will be implemented here
        </Text>
      </View>
    </ScrollView>
  );
}
