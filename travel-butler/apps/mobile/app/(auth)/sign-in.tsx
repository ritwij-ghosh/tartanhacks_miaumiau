import { useState, useEffect } from "react";
import { View, Text, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { Link, router } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { supabase } from "@/lib/supabase";
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_ANDROID_CLIENT_ID,
} from "@/lib/google-auth";

// Required for expo-auth-session to close the browser after redirect
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Google OIDC auth request — requests id_token for Supabase signInWithIdToken
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
  });

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === "success") {
      handleGoogleToken(response.params.id_token);
    } else if (response?.type === "error") {
      setError(response.error?.message ?? "Google sign-in failed");
      setGoogleLoading(false);
    } else if (response?.type === "dismiss") {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    setGoogleLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });
      if (err) {
        setError(err.message);
      } else {
        router.replace("/(main)/chat");
      }
    } catch (e: any) {
      setError(e.message ?? "Google sign-in failed");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (err) {
      setError(err.message);
    } else {
      router.replace("/(main)/chat");
    }
    setLoading(false);
  };

  const googleConfigured = !!GOOGLE_WEB_CLIENT_ID;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-surface-dark"
    >
      <View className="flex-1 justify-center px-8">
        <Text className="text-heading-xl text-white mb-2">Travel Butler</Text>
        <Text className="text-body-lg text-brand-300 mb-10">
          Your personal travel concierge
        </Text>

        {error && (
          <Text className="text-red-400 text-body-sm mb-4">{error}</Text>
        )}

        {/* ── Google OIDC Sign-In ──────────────────────── */}
        {googleConfigured && (
          <>
            <TouchableOpacity
              onPress={() => {
                setGoogleLoading(true);
                setError(null);
                promptAsync();
              }}
              disabled={!request || googleLoading}
              activeOpacity={0.8}
              className="bg-white rounded-2xl py-3.5 px-6 flex-row items-center justify-center mb-4"
              style={{ opacity: !request || googleLoading ? 0.5 : 1 }}
            >
              <Text className="text-body-md font-semibold text-gray-800">
                {googleLoading ? "Signing in…" : "Continue with Google"}
              </Text>
            </TouchableOpacity>

            <View className="flex-row items-center mb-4">
              <View className="flex-1 h-px bg-white/20" />
              <Text className="text-white/40 text-body-sm mx-4">or</Text>
              <View className="flex-1 h-px bg-white/20" />
            </View>
          </>
        )}

        {/* ── Email / Password ─────────────────────────── */}
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
          dark
        />
        <View className="h-6" />

        <Button title="Sign In" onPress={handleEmailSignIn} loading={loading} />

        <Link href="/(auth)/sign-up" asChild>
          <Text className="text-brand-300 text-body-md text-center mt-6">
            Don't have an account?{" "}
            <Text className="text-brand-400 font-semibold">Sign Up</Text>
          </Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
