import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

interface ToastProps {
  message: string;
  visible: boolean;
  variant?: "success" | "error" | "info";
  onDismiss?: () => void;
  duration?: number;
}

const variantStyles = {
  success: "bg-emerald-600",
  error: "bg-red-600",
  info: "bg-brand-600",
};

export function Toast({
  message,
  visible,
  variant = "info",
  onDismiss,
  duration = 3000,
}: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss?.());
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{ opacity }}
      className="absolute bottom-20 left-4 right-4 z-50"
    >
      <View
        className={`${variantStyles[variant]} rounded-xl px-4 py-3 shadow-card`}
      >
        <Text className="text-white text-body-md text-center">{message}</Text>
      </View>
    </Animated.View>
  );
}
