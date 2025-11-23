import { View, Text } from "react-native";

export default function EventsScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white dark:bg-backgroundDark">
      <Text className="text-2xl font-bold text-primary">Events</Text>
      <Text className="mt-4 text-text dark:text-textDark">
        Events list with RSVP will be implemented here
      </Text>
    </View>
  );
}
