import { View, Text, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { useState, useEffect, useRef } from "react";

// TODO: Re-enable Google OAuth once client ID is configured
// import * as Google from "expo-auth-session/providers/google";
// import * as WebBrowser from "expo-web-browser";
// import { supabase } from "@/lib/supabase";

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

  // Cycle through images every 1 second
  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sign-in.tsx:26',message:'Image cycling effect started',data:{initialIndex:0,interval:1000},timestamp:Date.now(),runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const interval = setInterval(() => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sign-in.tsx:29',message:'Image index update triggered',data:{currentIndex:currentImageIndex},timestamp:Date.now(),runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      setCurrentImageIndex((prev) => {
        const next = (prev + 1) % images.length;
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/425a2758-9714-4451-a9eb-a0714dde9f20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'sign-in.tsx:32',message:'Image index updated',data:{prev,next},timestamp:Date.now(),runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentImageIndex]);

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

      {/* New User — dark ink glassmorphic button */}
      <TouchableOpacity
        onPress={() => {
          // TODO: Re-enable OAuth backend integration
          // For now, just navigate to onboarding
          router.replace("/(auth)/onboarding");
        }}
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
        }}
      >
        <Text
          style={{
            color: PARCHMENT,
            fontWeight: "600",
            fontSize: 15,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          New User
        </Text>
      </TouchableOpacity>

      {/* Sign In — light glassmorphic button */}
      <TouchableOpacity
        onPress={() => {
          // TODO: Re-enable OAuth backend integration
          // For now, just navigate to chat
          router.replace("/(main)/chat");
        }}
        activeOpacity={0.7}
        style={{
          width: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.6)",
          borderWidth: 1.5,
          borderColor: "rgba(13, 43, 69, 0.25)",
          paddingVertical: 17,
          alignItems: "center",
          shadowColor: INK_DARK,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 3,
          overflow: "hidden",
        }}
      >
        <Text
          style={{
            color: INK_DARK,
            fontWeight: "600",
            fontSize: 15,
            letterSpacing: 1.5,
            textTransform: "uppercase",
          }}
        >
          Sign In
        </Text>
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
