import { useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Animated,
  TouchableOpacity,
  Dimensions,
  type ViewProps,
} from "react-native";

interface SheetProps extends ViewProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      damping: 20,
      stiffness: 200,
    }).start();
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="fade">
      <TouchableOpacity
        className="flex-1 bg-black/40"
        activeOpacity={1}
        onPress={onClose}
      />
      <Animated.View
        style={{ transform: [{ translateY }] }}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl"
      >
        {title && (
          <View className="px-5 pt-5 pb-2">
            <Text className="text-heading-md text-gray-900">{title}</Text>
          </View>
        )}
        <View className="px-5 pb-8">{children}</View>
      </Animated.View>
    </Modal>
  );
}
