import { View, Text } from "react-native";
import { useEffect, useRef } from "react";
import { Animated } from "react-native";

export interface ToolTrace {
  tool: string;
  status: "ok" | "error" | "pending";
  latency_ms?: number;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolTrace?: ToolTrace[];
}

interface MessageBubbleProps {
  message: Message;
}

const INK = "#202d8e";
const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";
const BLUE_ACCENT = "#112e93";
const TEXT_DARK = "#2B2B2B";
const PARCHMENT = "#fdf5ec";

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(isUser ? 20 : -20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (isUser) {
    // User message - right aligned
    return (
      <Animated.View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }],
        }}
      >
        <View
          style={{
            maxWidth: "75%",
            paddingHorizontal: 20,
            paddingVertical: 16,
            backgroundColor: "rgba(13, 43, 69, 0.08)",
            borderRadius: 24,
            borderTopRightRadius: 6,
            borderWidth: 1,
            borderColor: "rgba(13, 43, 69, 0.15)",
          }}
        >
          <Text
            style={{
              fontSize: 15,
              color: TEXT_DARK,
              fontWeight: "400",
              lineHeight: 22,
              fontFamily: "System",
            }}
          >
            {message.content}
          </Text>
        </View>
      </Animated.View>
    );
  }

  // Winston message - left aligned with avatar
  return (
    <Animated.View
      style={{
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      {/* Avatar with stamp aesthetic */}
      <Animated.View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: BLUE_ACCENT,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: BLUE_ACCENT,
          shadowOffset: { width: 2, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 0,
          elevation: 2,
          transform: [{ rotate: "-1deg" }],
        }}
      >
        <Text
          style={{
            color: PARCHMENT,
            fontSize: 14,
            fontFamily: "Georgia",
            fontWeight: "700",
          }}
        >
          W
        </Text>
      </Animated.View>

      {/* Message Bubble */}
      <View style={{ flex: 1, maxWidth: "75%" }}>
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 24,
            borderTopLeftRadius: 6,
            paddingHorizontal: 20,
            paddingVertical: 16,
            borderWidth: 1,
            borderColor: "rgba(17, 46, 147, 0.1)",
            shadowColor: BLUE_ACCENT,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 1,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              color: TEXT_DARK,
              fontWeight: "400",
              lineHeight: 22,
              fontFamily: "System",
            }}
          >
            {message.content}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}
