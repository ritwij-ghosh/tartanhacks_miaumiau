import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
} from "react-native";
import { router } from "expo-router";
import { CircleRating } from "@/components/ui/CircleRating";
import { useAuth } from "@/lib/auth";

const PARCHMENT = "#fdf5ec";
const INK = "#202d8e";
const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";
const BLUE_ACCENT = "#112e93";

const DIETARY_OPTIONS = ["None", "Vegetarian", "Vegan", "Halal", "Gluten-free"];
const ACTIVITY_OPTIONS = ["Culture", "Outdoors", "Food", "Nightlife", "Shopping"];

export default function OnboardingScreen() {
  const { updatePreferences } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Preference state
  const [travelPace, setTravelPace] = useState(3);
  const [dietary, setDietary] = useState<string[]>([]);
  const [budget, setBudget] = useState(3);
  const [activities, setActivities] = useState<string[]>([]);

  const toggleChip = (
    list: string[],
    setList: (v: string[]) => void,
    item: string
  ) => {
    setList(
      list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
    );
  };

  const handleFinish = async () => {
    setSaving(true);
    await updatePreferences({
      travel_pace: travelPace,
      dietary_restrictions: dietary,
      budget_range: budget,
      activity_preferences: activities,
    });
    setSaving(false);
    router.replace("/(main)/chat");
  };

  const steps = [
    // Step 0 — Travel Pace
    <View key="pace" style={{ flex: 1, justifyContent: "center", paddingVertical: 40 }}>
      <Text
        style={{
          fontFamily: "Georgia",
          fontWeight: "700",
          fontSize: 28,
          color: INK_DARK,
          textAlign: "center",
          marginBottom: 8,
          letterSpacing: -0.5,
        }}
      >
        How do you like to travel?
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: INK_LIGHT,
          textAlign: "center",
          marginBottom: 48,
          letterSpacing: 0.5,
        }}
      >
        Pick your pace
      </Text>
      <CircleRating
        value={travelPace}
        onChange={setTravelPace}
        labels={["Adventurous", "Relaxed"]}
      />
    </View>,

    // Step 1 — Dietary
    <View key="diet" style={{ flex: 1, justifyContent: "center", paddingVertical: 40 }}>
      <Text
        style={{
          fontFamily: "Georgia",
          fontWeight: "700",
          fontSize: 28,
          color: INK_DARK,
          textAlign: "center",
          marginBottom: 8,
          letterSpacing: -0.5,
        }}
      >
        Any dietary preferences?
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: INK_LIGHT,
          textAlign: "center",
          marginBottom: 48,
          letterSpacing: 0.5,
        }}
      >
        Select all that apply
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {DIETARY_OPTIONS.map((opt) => {
          const selected = dietary.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => toggleChip(dietary, setDietary, opt)}
              activeOpacity={0.7}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderWidth: 1.5,
                borderColor: selected
                  ? INK_DARK
                  : "rgba(13, 43, 69, 0.25)",
                backgroundColor: selected
                  ? "rgba(13, 43, 69, 0.1)"
                  : "rgba(255, 255, 255, 0.6)",
                shadowColor: INK_DARK,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: selected ? 0.15 : 0.05,
                shadowRadius: 8,
                elevation: selected ? 3 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: selected ? "600" : "400",
                  color: selected ? INK_DARK : INK_LIGHT,
                  letterSpacing: 0.3,
                }}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>,

    // Step 2 — Budget
    <View key="budget" style={{ flex: 1, justifyContent: "center", paddingVertical: 40 }}>
      <Text
        style={{
          fontFamily: "Georgia",
          fontWeight: "700",
          fontSize: 28,
          color: INK_DARK,
          textAlign: "center",
          marginBottom: 8,
          letterSpacing: -0.5,
        }}
      >
        What's your typical budget?
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: INK_LIGHT,
          textAlign: "center",
          marginBottom: 48,
          letterSpacing: 0.5,
        }}
      >
        Per-trip spending range
      </Text>
      <CircleRating
        value={budget}
        onChange={setBudget}
        labels={["Budget", "Luxury"]}
      />
    </View>,

    // Step 3 — Activities
    <View key="activities" style={{ flex: 1, justifyContent: "center", paddingVertical: 40 }}>
      <Text
        style={{
          fontFamily: "Georgia",
          fontWeight: "700",
          fontSize: 28,
          color: INK_DARK,
          textAlign: "center",
          marginBottom: 8,
          letterSpacing: -0.5,
        }}
      >
        What do you enjoy most?
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: INK_LIGHT,
          textAlign: "center",
          marginBottom: 48,
          letterSpacing: 0.5,
        }}
      >
        Select all that apply
      </Text>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 12,
        }}
      >
        {ACTIVITY_OPTIONS.map((opt) => {
          const selected = activities.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => toggleChip(activities, setActivities, opt)}
              activeOpacity={0.7}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderWidth: 1.5,
                borderColor: selected
                  ? INK_DARK
                  : "rgba(13, 43, 69, 0.25)",
                backgroundColor: selected
                  ? "rgba(13, 43, 69, 0.1)"
                  : "rgba(255, 255, 255, 0.6)",
                shadowColor: INK_DARK,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: selected ? 0.15 : 0.05,
                shadowRadius: 8,
                elevation: selected ? 3 : 1,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: selected ? "600" : "400",
                  color: selected ? INK_DARK : INK_LIGHT,
                  letterSpacing: 0.3,
                }}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>,
  ];

  const isLast = step === steps.length - 1;
  const scaleAnim = useState(new Animated.Value(1))[0];
  const dotScaleAnims = useState(
    steps.map(() => new Animated.Value(1))
  )[0];

  const handleNext = () => {
    if (isLast) {
      handleFinish();
    } else {
      // Animate button press
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    setStep(step - 1);
  };

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT, paddingHorizontal: 32, position: "relative" }}>
      {/* Decorative ink elements - subtle background accents */}
      <View
        style={{
          position: "absolute",
          top: Platform.OS === "ios" ? 100 : 80,
          right: 20,
          width: 2,
          height: 60,
          backgroundColor: "rgba(13, 43, 69, 0.08)",
        }}
      />

      {/* Decorative ink line at top */}
      <View
        style={{
          width: 60,
          height: 1.5,
          backgroundColor: "rgba(13, 43, 69, 0.2)",
          alignSelf: "center",
          marginTop: Platform.OS === "ios" ? 60 : 40,
          marginBottom: 24,
        }}
      />

      {/* Progress dots - hand-drawn style */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: 32,
          gap: 8,
        }}
      >
        {steps.map((_, i) => {
          const isActive = i === step;
          const isPast = i < step;
          return (
            <TouchableOpacity
              key={i}
              onPress={() => {
                Animated.sequence([
                  Animated.timing(dotScaleAnims[i], {
                    toValue: 0.85,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                  Animated.timing(dotScaleAnims[i], {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true,
                  }),
                ]).start();
                setStep(i);
              }}
              activeOpacity={0.7}
            >
              <Animated.View
                style={{
                  transform: [{ scale: dotScaleAnims[i] }],
                  width: isActive || isPast ? 32 : 8,
                  height: 8,
                  backgroundColor: isActive || isPast ? BLUE_ACCENT : "rgba(17, 46, 147, 0.15)",
                  borderWidth: isActive || isPast ? 1.5 : 1,
                  borderColor: isActive || isPast ? BLUE_ACCENT : "rgba(17, 46, 147, 0.25)",
                }}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {steps[step]}
      </ScrollView>

      {/* Light blue gradient at bottom - soft and seamless */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 180,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 180,
            backgroundColor: "rgba(173, 206, 230, 0.12)",
            opacity: 0.6,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 120,
            backgroundColor: "rgba(173, 206, 230, 0.08)",
            opacity: 0.5,
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            backgroundColor: "rgba(173, 206, 230, 0.05)",
            opacity: 0.4,
          }}
        />
      </View>

      {/* Navigation */}
      <View style={{ paddingBottom: Platform.OS === "ios" ? 32 : 24, paddingTop: 16, position: "relative", zIndex: 1 }}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={handleNext}
            disabled={saving}
            activeOpacity={0.7}
            style={{
              backgroundColor: INK_DARK,
              borderWidth: 1.5,
              borderColor: "rgba(13, 43, 69, 0.3)",
              paddingVertical: 17,
              alignItems: "center",
              shadowColor: INK_DARK,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 14,
              elevation: 4,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <ActivityIndicator size="small" color={PARCHMENT} />
            ) : (
              <Text
                style={{
                  color: PARCHMENT,
                  fontWeight: "600",
                  fontSize: 15,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                {isLast ? "Get Started" : "Next"}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {step > 0 && (
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.7}
            style={{
              marginTop: 12,
              alignItems: "center",
              paddingVertical: 8,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: INK_LIGHT,
                fontWeight: "400",
                letterSpacing: 0.5,
              }}
            >
              Back
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
