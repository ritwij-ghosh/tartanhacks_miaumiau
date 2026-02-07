import { View, Text, TouchableOpacity, Animated } from "react-native";
import { useState, useRef } from "react";

const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";
const PARCHMENT = "#fdf5ec";
const BLUE_ACCENT = "#112e93";

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
  const scaleAnims = useRef(
    Array.from({ length: count }, () => new Animated.Value(1))
  ).current;

  const handlePress = (n: number, index: number) => {
    // Animate press
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    onChange(n);
  };

  return (
    <View>
      {labels && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingHorizontal: 8,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              color: INK_LIGHT,
              fontWeight: "400",
              letterSpacing: 0.5,
            }}
          >
            {labels[0]}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: INK_LIGHT,
              fontWeight: "400",
              letterSpacing: 0.5,
            }}
          >
            {labels[1]}
          </Text>
        </View>
      )}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 8,
        }}
      >
        {Array.from({ length: count }, (_, i) => i + 1).map((n, index) => {
          const isSelected = n <= value;
          return (
            <Animated.View
              key={n}
              style={{
                transform: [{ scale: scaleAnims[index] }],
              }}
            >
              <TouchableOpacity
                onPress={() => handlePress(n, index)}
                activeOpacity={0.7}
                style={{
                  width: 48,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isSelected
                      ? BLUE_ACCENT
                      : "rgba(255, 255, 255, 0.6)",
                    borderWidth: 1.5,
                    borderColor: isSelected
                      ? BLUE_ACCENT
                      : "rgba(61, 63, 160, 0.25)",
                    shadowColor: BLUE_ACCENT,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.15 : 0.05,
                    shadowRadius: 8,
                    elevation: isSelected ? 3 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: isSelected ? "600" : "400",
                      color: isSelected ? PARCHMENT : INK_LIGHT,
                    }}
                  >
                    {n}
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}
