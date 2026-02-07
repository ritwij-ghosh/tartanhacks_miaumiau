import { useState, useRef, useEffect } from "react";
import { View, TextInput, TouchableOpacity, Text, Platform, Animated, Keyboard } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PARCHMENT = "#fdf5ec";
const INK = "#202d8e";
const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";
const BLUE_ACCENT = "#112e93";
const TEXT_DARK = "#2B2B2B";
const MUTED_BLUE = "#6B7B9E";

interface ComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
}

export function Composer({ onSend, disabled = false }: ComposerProps) {
  const [text, setText] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const sendScale = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    
    // Animate send button
    Animated.sequence([
      Animated.timing(sendScale, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(sendScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    onSend(trimmed);
    setText("");
  };

  const bottomPadding = Platform.OS === "ios" 
    ? Math.max(insets.bottom, keyboardHeight > 0 ? 8 : 16)
    : 20;

  return (
    <View
      style={{
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: bottomPadding,
        backgroundColor: PARCHMENT,
      }}
    >
      {/* Subtle top gradient fade */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 32,
          backgroundColor: PARCHMENT,
          opacity: 0.95,
        }}
      />

          <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 28,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderWidth: 1,
            borderColor: "rgba(17, 46, 147, 0.15)",
            shadowColor: BLUE_ACCENT,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 2,
          }}
        >
        <TextInput
          style={{
            flex: 1,
            fontSize: 15,
            color: TEXT_DARK,
            fontWeight: "400",
            paddingVertical: 0,
            backgroundColor: "transparent",
            maxHeight: 96,
            marginRight: 12,
            fontFamily: "System",
          }}
          placeholder="Message Winston..."
          placeholderTextColor="rgba(107, 123, 158, 0.5)"
          value={text}
          onChangeText={setText}
          multiline
          editable={!disabled}
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />

        {/* Send Button */}
        <Animated.View style={{ transform: [{ scale: sendScale }, { rotate: "1deg" }] }}>
          <TouchableOpacity
            onPress={handleSend}
            disabled={disabled || !text.trim()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: text.trim() ? BLUE_ACCENT : "rgba(17, 46, 147, 0.1)",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: BLUE_ACCENT,
              shadowOffset: { width: 2, height: 2 },
              shadowOpacity: text.trim() ? 0.2 : 0.1,
              shadowRadius: 0,
              elevation: text.trim() ? 2 : 1,
            }}
            activeOpacity={0.7}
          >
            <Text
              style={{
                color: text.trim() ? PARCHMENT : MUTED_BLUE,
                fontSize: 18,
                fontWeight: "600",
              }}
            >
              ↑
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}
