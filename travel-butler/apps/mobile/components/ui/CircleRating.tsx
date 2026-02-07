import { View, Text, TouchableOpacity } from "react-native";

interface CircleRatingProps {
  value: number;
  onChange: (v: number) => void;
  count?: number;
  labels?: [string, string];
}

export function CircleRating({
  value,
  onChange,
  count = 5,
  labels,
}: CircleRatingProps) {
  return (
    <View>
      {labels && (
        <View className="flex-row justify-between mb-2">
          <Text className="text-body-sm text-brand-300">{labels[0]}</Text>
          <Text className="text-body-sm text-brand-300">{labels[1]}</Text>
        </View>
      )}
      <View className="flex-row justify-between items-center">
        {Array.from({ length: count }, (_, i) => i + 1).map((n) => (
          <TouchableOpacity
            key={n}
            onPress={() => onChange(n)}
            activeOpacity={0.7}
            className="items-center justify-center"
            style={{ width: 44, height: 44 }}
          >
            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${
                n <= value
                  ? "bg-brand-500"
                  : "bg-transparent border-2 border-white/30"
              }`}
            >
              <Text
                className={`text-body-md font-semibold ${
                  n <= value ? "text-white" : "text-white/40"
                }`}
              >
                {n}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
