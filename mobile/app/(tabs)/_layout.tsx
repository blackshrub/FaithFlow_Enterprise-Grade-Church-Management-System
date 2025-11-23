import { Tabs } from "expo-router";
import { Home, Calendar, Heart, Users, Menu } from "lucide-react-native";
import { useColorScheme } from "react-native";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#F9FAFB" : "#111827";
  const activeColor = "#6366F1";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: iconColor,
        tabBarStyle: {
          backgroundColor: colorScheme === "dark" ? "#1F2937" : "#FFFFFF",
          borderTopColor: colorScheme === "dark" ? "#374151" : "#E5E7EB",
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: "Events",
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="give"
        options={{
          title: "Give",
          tabBarIcon: ({ color, size }) => <Heart color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "Groups",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: "More",
          tabBarIcon: ({ color, size }) => <Menu color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
