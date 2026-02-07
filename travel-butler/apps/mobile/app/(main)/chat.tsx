import { useState, useRef } from "react";
import { View, FlatList, KeyboardAvoidingView, Platform } from "react-native";
import { MessageBubble, type Message, type ToolTrace } from "@/components/chat/MessageBubble";
import { ToolStatusBubble } from "@/components/chat/ToolStatusBubble";
import { Composer } from "@/components/chat/Composer";
import { api } from "@/lib/api";

/**
 * Local mock reply for when the backend isn't running.
 * Gives you something to iterate UI against immediately.
 */
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

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your Travel Butler. Tell me about your trip — destination, dates, what you need — and I'll handle the rest. ✈️",
    },
  ]);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleSend = async (text: string) => {
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await api.post("/chat/send", { message: text });
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.reply,
        toolTrace: res.tool_trace,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      // Backend not reachable — fall back to local mock so UI still works
      const mock = mockReply(text);
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
      className="flex-1 bg-surface-secondary"
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        className="flex-1 px-4 pt-2"
        contentContainerStyle={{ paddingBottom: 8 }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        renderItem={({ item }) => (
          <View className="mb-2">
            <MessageBubble message={item} />
            {item.toolTrace?.map((t: ToolTrace, i: number) => (
              <ToolStatusBubble key={i} trace={t} />
            ))}
          </View>
        )}
      />
      <Composer onSend={handleSend} disabled={sending} />
    </KeyboardAvoidingView>
  );
}
