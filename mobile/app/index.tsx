import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/auth";

export default function Index() {
  const { token } = useAuthStore();

  // Redirect to auth if no token, otherwise to tabs
  if (!token) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)" />;
}
