import { useState } from "react";
import { View, TextInput, TouchableOpacity, Text } from "react-native";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled = false }: ComposerProps) {
  const [text, setText] = useState("");

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setText("");
  };

  return (
    <View className="flex-row items-end px-3 py-2 bg-white border-t border-gray-100">
      <TextInput
        className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-body-md text-gray-900 max-h-24"
        placeholder="Ask your Travel Butler..."
        placeholderTextColor="#94A3B8"
        value={text}
        onChangeText={setText}
        multiline
        editable={!disabled}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
      />
      <TouchableOpacity
        onPress={handleSend}
        disabled={disabled || !text.trim()}
        className={`ml-2 w-10 h-10 rounded-full items-center justify-center ${
          text.trim() ? "bg-brand-500" : "bg-gray-200"
        }`}
        activeOpacity={0.7}
      >
        <Text className="text-white text-body-md">↑</Text>
      </TouchableOpacity>
    </View>
  );
}
