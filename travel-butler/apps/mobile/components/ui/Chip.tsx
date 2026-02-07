import { View, Text } from "react-native";

type ChipVariant = "brand" | "green" | "amber" | "red" | "gray";

interface ChipProps {
  label: string;
  variant?: ChipVariant;
}

const variantStyles: Record<ChipVariant, { bg: string; text: string }> = {
  brand: { bg: "bg-brand-100", text: "text-brand-700" },
  green: { bg: "bg-emerald-100", text: "text-emerald-700" },
  amber: { bg: "bg-amber-100", text: "text-amber-700" },
  red: { bg: "bg-red-100", text: "text-red-700" },
  gray: { bg: "bg-gray-100", text: "text-gray-600" },
};

export function Chip({ label, variant = "gray" }: ChipProps) {
  const style = variantStyles[variant];
  return (
    <View className={`${style.bg} rounded-full px-2.5 py-0.5`}>
      <Text className={`${style.text} text-caption font-medium`}>{label}</Text>
    </View>
  );
}
