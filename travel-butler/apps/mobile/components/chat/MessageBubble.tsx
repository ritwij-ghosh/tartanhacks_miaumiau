import { View, Text } from "react-native";

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

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <View className={`flex-row ${isUser ? "justify-end" : "justify-start"}`}>
      <View
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-brand-500 rounded-br-md"
            : "bg-white shadow-card rounded-bl-md"
        }`}
        style={
          !isUser
            ? {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 2,
                elevation: 1,
              }
            : undefined
        }
      >
        <Text
          className={`text-body-md ${isUser ? "text-white" : "text-gray-900"}`}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}
