import { View, Text } from "react-native";

export default function GroupsScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-backgroundDark">
      <Text className="text-2xl font-bold text-primary">Groups</Text>
      <Text className="mt-4 text-text dark:text-textDark">
        Groups list and join requests will be implemented here
      </Text>
    </View>
  );
}
