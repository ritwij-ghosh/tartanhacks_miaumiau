import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useState, useEffect } from "react";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";

// Needed so the browser auth session can return to the app
WebBrowser.maybeCompleteAuthSession();

const INK = "#202d8e";
const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";
const PARCHMENT = "#fdf5ec";

// Import images
const image1 = require("@/assets/{ }.png");
const image2 = require("@/assets/2.png");
const image3 = require("@/assets/3.png");

const images = [image1, image2, image3];

export default function SignInScreen() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  // Google sign-in via Supabase OAuth (works in Expo Go)
  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      // This is the URL Expo Go will listen on to receive the redirect
      const redirectTo = makeRedirectUri();

      // Ask Supabase to start the Google OAuth flow.
      // Google will only see Supabase's callback URL as the redirect_uri,
      // NOT the exp:// URL — so no 400 error.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          scopes: "openid email profile https://www.googleapis.com/auth/calendar",
          queryParams: {
            access_type: "offline",   // ensures Google returns a refresh_token
            prompt: "consent",        // always show consent so we get a fresh refresh_token
          },
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error("No OAuth URL returned");

      // Open the Supabase auth URL in an in-app browser
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === "success") {
        // Supabase returns tokens in the URL hash fragment:
        // #access_token=SUPABASE_JWT&refresh_token=SUPABASE_REFRESH
        //  &provider_token=GOOGLE_ACCESS_TOKEN&provider_refresh_token=GOOGLE_REFRESH_TOKEN
        const hashPart = result.url.split("#")[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          // Google's provider tokens (for Calendar API access)
          const provider_token = params.get("provider_token");
          const provider_refresh_token = params.get("provider_refresh_token");

          console.log("[sign-in] Hash params:", Array.from(params.keys()).join(", "));
          console.log("[sign-in] provider_token present:", !!provider_token);
          console.log("[sign-in] provider_refresh_token present:", !!provider_refresh_token);

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;

            // Store Google provider tokens on the backend so it can use the
            // Calendar API on the user's behalf. Uses the just-received
            // Supabase access_token directly (don't rely on getSession()
            // which may not have propagated yet).
            if (provider_token) {
              const API_BASE =
                process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
              try {
                const storeResp = await fetch(
                  `${API_BASE}/oauth/google/store-tokens`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${access_token}`,
                    },
                    body: JSON.stringify({
                      provider_token,
                      provider_refresh_token: provider_refresh_token || null,
                    }),
                  }
                );
                console.log("[sign-in] store-tokens response:", storeResp.status);
              } catch (err) {
                console.warn("[sign-in] Could not store Google Calendar tokens:", err);
              }
            } else {
              console.warn("[sign-in] No provider_token in redirect — calendar won't be connected");
            }

            // Navigate to root — index.tsx will redirect to onboarding or chat
            router.replace("/");
            return;
          }
        }
        // If we get here, something went wrong with token extraction
        throw new Error("Could not extract session from redirect");
      }
      // User cancelled — do nothing
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      Alert.alert("Sign-in failed", err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  // Cycle through images every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: PARCHMENT,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 32,
      }}
    >
      {/* Radial light-blue glow behind title, nudged below - soft and seamless */}
      <View
        style={{
          position: "absolute",
          top: "36%",
          width: 300,
          height: 300,
          borderRadius: 150,
          backgroundColor: "rgba(173, 206, 230, 0.18)",
          transform: [{ translateY: 35 }],
          opacity: 0.8,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: "37%",
          width: 260,
          height: 260,
          borderRadius: 130,
          backgroundColor: "rgba(173, 206, 230, 0.15)",
          transform: [{ translateY: 35 }],
          opacity: 0.7,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: "38%",
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: "rgba(173, 206, 230, 0.12)",
          transform: [{ translateY: 35 }],
          opacity: 0.6,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: "39%",
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: "rgba(173, 206, 230, 0.10)",
          transform: [{ translateY: 35 }],
          opacity: 0.5,
        }}
      />
      <View
        style={{
          position: "absolute",
          top: "40%",
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: "rgba(173, 206, 230, 0.08)",
          transform: [{ translateY: 35 }],
          opacity: 0.4,
        }}
      />

      {/* Cycling Images */}
      <View
        style={{
          marginBottom: 16,
          alignItems: "center",
          justifyContent: "center",
          width: 140,
          height: 140,
        }}
      >
        {images.map((img, idx) => (
          <Image
            key={idx}
            source={img}
            style={{
              width: 140,
              height: 140,
              resizeMode: "contain",
              position: "absolute",
              opacity: idx === currentImageIndex ? 1 : 0,
            }}
          />
        ))}
      </View>

      {/* Title */}
      <Text
        style={{
          fontFamily: "Georgia",
          fontWeight: "700",
          fontSize: 44,
          lineHeight: 52,
          color: INK_DARK,
          letterSpacing: -0.5,
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Winston AI
      </Text>

      {/* Decorative ink line */}
      <View
        style={{
          width: 100,
          height: 1.5,
          backgroundColor: "rgba(13, 43, 69, 0.25)",
          marginBottom: 10,
        }}
      />

      {/* Subtitle */}
      <Text
        style={{
          fontWeight: "400",
          fontSize: 13,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: INK_LIGHT,
          textAlign: "center",
          marginBottom: 60,
        }}
      >
        Travel Butler
      </Text>

      {/* Sign In with Google — dark ink button */}
      <TouchableOpacity
        onPress={signInWithGoogle}
        disabled={loading}
        activeOpacity={0.7}
        style={{
          width: "100%",
          backgroundColor: INK_DARK,
          borderWidth: 1.5,
          borderColor: "rgba(13, 43, 69, 0.3)",
          paddingVertical: 17,
          alignItems: "center",
          marginBottom: 14,
          shadowColor: INK_DARK,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 14,
          elevation: 4,
          overflow: "hidden",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color={PARCHMENT} />
        ) : (
        <Text
          style={{
            color: PARCHMENT,
            fontWeight: "600",
            fontSize: 15,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
            Continue with Google
        </Text>
        )}
      </TouchableOpacity>

      {/* Bottom decorative */}
      <Text
        style={{
          position: "absolute",
          bottom: 44,
          fontFamily: "Georgia",
          fontStyle: "italic",
          fontSize: 12,
          color: INK_LIGHT,
          letterSpacing: 1,
        }}
      >
        est. Tokyo · 2026
      </Text>
    </View>
  );
}
