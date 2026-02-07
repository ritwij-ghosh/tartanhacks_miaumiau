import { View, Text } from "react-native";
import type { ToolTrace } from "./MessageBubble";

interface ToolStatusBubbleProps {
  trace: ToolTrace;
}

const statusIcons = {
  ok: "✅",
  error: "❌",
  pending: "⏳",
};

export function ToolStatusBubble({ trace }: ToolStatusBubbleProps) {
  return (
    <View className="flex-row items-center ml-2 mt-1">
      <View className="bg-gray-50 rounded-xl px-3 py-1.5 flex-row items-center">
        <Text className="text-caption mr-1">{statusIcons[trace.status]}</Text>
        <Text className="text-caption text-muted font-medium">
          {trace.tool}
        </Text>
        {trace.latency_ms !== undefined && (
          <Text className="text-caption text-muted/60 ml-1">
            {trace.latency_ms}ms
          </Text>
        )}
      </View>
    </View>
  );
}
