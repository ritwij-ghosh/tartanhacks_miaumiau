import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";

export default function Index() {
  const { session, loading, hasCompletedOnboarding } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 bg-surface-dark items-center justify-center">
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!hasCompletedOnboarding) return <Redirect href="/(auth)/onboarding" />;
  return <Redirect href="/(main)/chat" />;
}
