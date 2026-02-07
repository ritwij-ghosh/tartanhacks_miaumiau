import { View, Text, TouchableOpacity } from "react-native";
import { router } from "expo-router";

// TODO: Re-enable Google OAuth once client ID is configured
// import * as Google from "expo-auth-session/providers/google";
// import * as WebBrowser from "expo-web-browser";
// import { supabase } from "@/lib/supabase";

export default function SignInScreen() {
  return (
    <View className="flex-1 bg-surface-dark justify-center items-center px-8">
      <Text
        className="text-white text-center mb-2"
        style={{ fontSize: 36, lineHeight: 44, fontWeight: "700" }}
      >
        Travel Butler
      </Text>
      <Text
        className="text-brand-300 text-center mb-16"
        style={{ fontSize: 18, lineHeight: 26 }}
      >
        Your personal travel concierge
      </Text>

      <TouchableOpacity
        onPress={() => router.replace("/(auth)/onboarding")}
        activeOpacity={0.8}
        className="bg-brand-500 rounded-2xl items-center justify-center mb-5"
        style={{ width: "100%", paddingVertical: 20 }}
      >
        <Text
          className="text-white"
          style={{ fontSize: 22, fontWeight: "600" }}
        >
          I'm New
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => router.replace("/(main)/chat")}
        activeOpacity={0.8}
        className="bg-white rounded-2xl items-center justify-center"
        style={{ width: "100%", paddingVertical: 20 }}
      >
        <Text
          className="text-gray-800"
          style={{ fontSize: 22, fontWeight: "600" }}
        >
          Login
        </Text>
      </TouchableOpacity>
    </View>
  );
}
