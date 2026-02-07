import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { api } from "@/lib/api";
import { Message, ToolTrace } from "@/components/chat/MessageBubble";

const PARCHMENT = "#fdf5ec";
const INK = "#202d8e";
const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";

interface Itinerary {
  id: string;
  destination: string;
  dates: string;
  hotel: string;
  flight: string;
  status: string;
}

// Mock reply function for when backend isn't available
function mockReply(text: string): { reply: string; tool_trace: ToolTrace[] } {
  const lower = text.toLowerCase();
  if (lower.includes("flight") || lower.includes("fly")) {
    return {
      reply:
        "I found 3 flight options for you:\n  ✈️ United UA 234 — $342\n  ✈️ Delta DL 505 — $289\n  ✈️ JetBlue B6 816 — $265\n\nWant me to book one?",
      tool_trace: [{ tool: "flight.search_offers", status: "ok", latency_ms: 120 }],
    };
  }
  if (lower.includes("hotel") || lower.includes("stay")) {
    return {
      reply:
        "Here are some hotels:\n  🏨 The Standard, High Line — $171/night\n  🏨 Pod 51 — $99/night\n  🏨 The NoMad Hotel — $245/night",
      tool_trace: [{ tool: "hotel.search", status: "ok", latency_ms: 95 }],
    };
  }
  if (lower.includes("dinner") || lower.includes("restaurant") || lower.includes("eat")) {
    return {
      reply:
        "Great taste! Here are some options:\n  🍽 Le Bernardin — French Seafood\n  🍽 Peter Luger — Steakhouse\n  🍽 Momofuku Noodle Bar — Asian Fusion",
      tool_trace: [{ tool: "dining.search", status: "ok", latency_ms: 88 }],
    };
  }
  return {
    reply:
      "I'm your Travel Butler! I can help with:\n  ✈️ Flights — search & book\n  🏨 Hotels — find the best stays\n  🍽 Dining — restaurant reservations\n  🗓 Itineraries — layover & trip plans\n\nJust tell me what you need!",
    tool_trace: [],
  };
}

export default function DashboardScreen() {
  const [activeView, setActiveView] = useState<"present" | "future" | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Good evening. I'm Winston, your travel assistant. How may I help you plan your next journey?",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Dummy itineraries
  const mockItineraries = {
    present: [
      {
        id: "1",
        destination: "Tokyo",
        dates: "Feb 5-8, 2026",
        hotel: "Park Hyatt Tokyo",
        flight: "NH 203 — SFO to NRT",
        status: "In Progress",
      },
    ] as Itinerary[],
    future: [
      {
        id: "2",
        destination: "San Francisco",
        dates: "Mar 15-20, 2026",
        hotel: "Fairmont SF",
        flight: "UA 512 — NRT to SFO",
        status: "Confirmed",
      },
      {
        id: "3",
        destination: "London",
        dates: "Apr 2-6, 2026",
        hotel: "The Savoy",
        flight: "BA 286 — SFO to LHR",
        status: "Pending",
      },
    ] as Itinerary[],
  };

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || sending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setSending(true);

    // Animate button press
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      const res = await api.post("/chat/send", { message: inputValue });
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.reply,
        toolTrace: res.tool_trace,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Backend not reachable — fall back to local mock
      const mock = mockReply(userMsg.content);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: mock.reply,
          toolTrace: mock.tool_trace,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: PARCHMENT }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ paddingHorizontal: 24, paddingTop: Platform.OS === "ios" ? 60 : 40, paddingBottom: 12, position: "relative" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={{ padding: 8 }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 20, color: INK_DARK }}>←</Text>
            </TouchableOpacity>
            <View style={{ position: "relative", alignItems: "center" }}>
              {/* Light blue radial gradient behind title - grainy effect with multiple layers */}
              <View
                style={{
                  position: "absolute",
                  top: 12, // Nudged below text
                  width: 220,
                  height: 220,
                  borderRadius: 110,
                  backgroundColor: "rgba(173, 206, 230, 0.18)",
                  opacity: 0.7,
                  shadowColor: "rgba(173, 206, 230, 0.3)",
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 1,
                  shadowRadius: 20,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 16,
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  backgroundColor: "rgba(173, 206, 230, 0.12)",
                  opacity: 0.5,
                }}
              />
              <View
                style={{
                  position: "absolute",
                  top: 20,
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: "rgba(173, 206, 230, 0.08)",
                  opacity: 0.4,
                }}
              />
              <Text
                style={{
                  fontFamily: "Georgia",
                  fontWeight: "700",
                  fontSize: 24,
                  letterSpacing: -0.5,
                  color: INK_DARK,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                Winston AI
              </Text>
            </View>
            <View style={{ width: 38 }} />
          </View>
        </View>

        {/* Segmented Toggle */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "center" }}>
            <TouchableOpacity
              onPress={() => setActiveView(activeView === "present" ? null : "present")}
              activeOpacity={0.8}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderWidth: 1.5,
                borderColor: "rgba(13, 43, 69, 0.25)",
                borderRightWidth: 0,
                backgroundColor: activeView === "present" ? "rgba(13, 43, 69, 0.1)" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: activeView === "present" ? "600" : "400",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: INK_DARK,
                }}
              >
                Present Itineraries
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveView(activeView === "future" ? null : "future")}
              activeOpacity={0.8}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderWidth: 1.5,
                borderColor: "rgba(13, 43, 69, 0.25)",
                backgroundColor: activeView === "future" ? "rgba(13, 43, 69, 0.1)" : "transparent",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: activeView === "future" ? "600" : "400",
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: INK_DARK,
                }}
              >
                Future Itineraries
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Itinerary List */}
        {activeView && (
          <View style={{ paddingHorizontal: 24, marginBottom: 12 }}>
            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "rgba(13, 43, 69, 0.15)",
                marginBottom: 12,
              }}
            />
            {mockItineraries[activeView].map((itinerary) => (
              <View
                key={itinerary.id}
                style={{
                  marginBottom: 8,
                  padding: 14,
                  backgroundColor: "rgba(173, 180, 200, 0.15)", // Muted grayish light blue
                  borderWidth: 1.5,
                  borderColor: "rgba(13, 43, 69, 0.2)",
                }}
              >
                {/* Flight */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>✈️</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "500",
                        color: INK_DARK,
                        marginBottom: 4,
                      }}
                    >
                      {itinerary.flight}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: "rgba(13, 43, 69, 0.2)",
                      backgroundColor: "rgba(13, 43, 69, 0.05)",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: INK_LIGHT,
                        letterSpacing: 0.5,
                        textTransform: "uppercase",
                      }}
                    >
                      {itinerary.status}
                    </Text>
                  </View>
                </View>

                {/* Destination */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>📍</Text>
                  <View>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: INK_DARK,
                        fontFamily: "Georgia",
                        marginBottom: 2,
                      }}
                    >
                      {itinerary.destination}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "400",
                        color: INK_LIGHT,
                      }}
                    >
                      {itinerary.dates}
                    </Text>
                  </View>
                </View>

                {/* Hotel */}
                <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>🛏️</Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "400",
                      color: INK_LIGHT,
                    }}
                  >
                    {itinerary.hotel}
                  </Text>
                </View>
              </View>
            ))}
            {/* Bottom divider */}
            <View
              style={{
                height: 1,
                backgroundColor: "rgba(13, 43, 69, 0.15)",
                marginTop: 12,
              }}
            />
          </View>
        )}

        {/* Chat Messages */}
        <View style={{ paddingHorizontal: 24, minHeight: 300, marginBottom: 12 }}>
          {messages.map((item) => (
            <View
              key={item.id}
              style={{
                flexDirection: "row",
                justifyContent: item.role === "user" ? "flex-end" : "flex-start",
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  maxWidth: "80%",
                  padding: 12,
                  backgroundColor: item.role === "assistant" ? "#FFFFFF" : "rgba(13, 43, 69, 0.08)",
                  borderWidth: 1,
                  borderColor:
                    item.role === "assistant"
                      ? "rgba(13, 43, 69, 0.1)"
                      : "rgba(13, 43, 69, 0.15)",
                  borderLeftWidth: item.role === "assistant" ? 2 : 1,
                }}
              >
                {item.role === "assistant" && (
                  <Text
                    style={{
                      fontFamily: "Georgia",
                      fontSize: 11,
                      fontWeight: "600",
                      color: INK_LIGHT,
                      marginBottom: 6,
                      letterSpacing: 0.5,
                    }}
                  >
                    Winston
                  </Text>
                )}
                <Text
                  style={{
                    fontSize: 14,
                    color: INK,
                    fontWeight: "400",
                    lineHeight: 20,
                  }}
                >
                  {item.content}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Chat Input */}
      <View
        style={{
          borderTopWidth: 1.5,
          borderTopColor: "rgba(13, 43, 69, 0.15)",
          paddingTop: 12,
          paddingHorizontal: 24,
          paddingBottom: Platform.OS === "ios" ? 20 : 12,
          backgroundColor: PARCHMENT,
        }}
      >
        <View
          style={{
            width: 40,
            height: 1,
            backgroundColor: "rgba(13, 43, 69, 0.2)",
            marginBottom: 8,
          }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Ask Winston..."
            placeholderTextColor="rgba(13, 43, 69, 0.4)"
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            style={{
              flex: 1,
              fontSize: 14,
              color: INK_DARK,
              fontWeight: "400",
              paddingVertical: 8,
              borderBottomWidth: 1.5,
              borderBottomColor: "rgba(13, 43, 69, 0.2)",
              backgroundColor: "transparent",
            }}
          />
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              onPress={handleSendMessage}
              disabled={!inputValue.trim() || sending}
              activeOpacity={0.7}
              style={{
                width: 36,
                height: 36,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1.5,
                borderColor: "rgba(13, 43, 69, 0.3)",
                backgroundColor: inputValue.trim() ? "rgba(13, 43, 69, 0.1)" : "transparent",
              }}
            >
              <Text style={{ fontSize: 16, color: INK_DARK }}>↑</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
