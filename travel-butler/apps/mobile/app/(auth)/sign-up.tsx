import { useState } from "react";
import { View, Text, KeyboardAvoidingView, Platform } from "react-native";
import { Link, router } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setError(err.message);
    } else {
      router.replace("/(main)/chat");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-surface-dark"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-heading-xl text-white mb-2">Create Account</Text>
        <Text className="text-body-lg text-brand-300 mb-10">
          Start planning your trips
        </Text>

        {error && (
          <Text className="text-red-400 text-body-sm mb-4">{error}</Text>
        )}

        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          dark
        />
        <View className="h-3" />
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <View className="h-6" />

        <Button title="Create Account" onPress={handleSignUp} loading={loading} />

        <Link href="/(auth)/sign-in" asChild>
          <Text className="text-brand-300 text-body-md text-center mt-6">
            Already have an account? <Text className="text-brand-400 font-semibold">Sign In</Text>
          </Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
