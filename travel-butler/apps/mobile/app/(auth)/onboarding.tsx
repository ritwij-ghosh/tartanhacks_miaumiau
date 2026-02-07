import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { CircleRating } from "@/components/ui/CircleRating";
import { useAuth } from "@/lib/auth";

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
    <View key="pace" className="flex-1 justify-center">
      <Text className="text-heading-lg text-white mb-2 text-center">
        How do you like to travel?
      </Text>
      <Text className="text-body-md text-brand-300 mb-8 text-center">
        Pick your pace
      </Text>
      <CircleRating
        value={travelPace}
        onChange={setTravelPace}
        labels={["Adventurous", "Relaxed"]}
      />
    </View>,

    // Step 1 — Dietary
    <View key="diet" className="flex-1 justify-center">
      <Text className="text-heading-lg text-white mb-2 text-center">
        Any dietary preferences?
      </Text>
      <Text className="text-body-md text-brand-300 mb-8 text-center">
        Select all that apply
      </Text>
      <View className="flex-row flex-wrap justify-center gap-3">
        {DIETARY_OPTIONS.map((opt) => {
          const selected = dietary.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => toggleChip(dietary, setDietary, opt)}
              activeOpacity={0.7}
              className={`rounded-full px-5 py-2.5 border ${
                selected
                  ? "bg-brand-500 border-brand-500"
                  : "bg-transparent border-white/30"
              }`}
            >
              <Text
                className={`text-body-md font-medium ${
                  selected ? "text-white" : "text-white/60"
                }`}
              >
                {opt}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>,

    // Step 2 — Budget
    <View key="budget" className="flex-1 justify-center">
      <Text className="text-heading-lg text-white mb-2 text-center">
        What's your typical budget?
      </Text>
      <Text className="text-body-md text-brand-300 mb-8 text-center">
        Per-trip spending range
      </Text>
      <CircleRating
        value={budget}
        onChange={setBudget}
        labels={["Budget", "Luxury"]}
      />
    </View>,

    // Step 3 — Activities
    <View key="activities" className="flex-1 justify-center">
      <Text className="text-heading-lg text-white mb-2 text-center">
        What do you enjoy most?
      </Text>
      <Text className="text-body-md text-brand-300 mb-8 text-center">
        Select all that apply
      </Text>
      <View className="flex-row flex-wrap justify-center gap-3">
        {ACTIVITY_OPTIONS.map((opt) => {
          const selected = activities.includes(opt);
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => toggleChip(activities, setActivities, opt)}
              activeOpacity={0.7}
              className={`rounded-full px-5 py-2.5 border ${
                selected
                  ? "bg-brand-500 border-brand-500"
                  : "bg-transparent border-white/30"
              }`}
            >
              <Text
                className={`text-body-md font-medium ${
                  selected ? "text-white" : "text-white/60"
                }`}
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

  return (
    <View className="flex-1 bg-surface-dark px-8">
      {/* Progress dots */}
      <View className="flex-row justify-center mt-16 mb-8 gap-2">
        {steps.map((_, i) => (
          <View
            key={i}
            className={`h-2 rounded-full ${
              i === step ? "w-8 bg-brand-500" : "w-2 bg-white/20"
            }`}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        {steps[step]}
      </ScrollView>

      {/* Navigation */}
      <View className="pb-12 pt-4">
        <TouchableOpacity
          onPress={isLast ? handleFinish : () => setStep(step + 1)}
          disabled={saving}
          activeOpacity={0.8}
          className="bg-brand-500 rounded-2xl py-4 items-center justify-center"
          style={{ opacity: saving ? 0.5 : 1 }}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-body-md font-semibold text-white">
              {isLast ? "Get Started" : "Next"}
            </Text>
          )}
        </TouchableOpacity>

        {step > 0 && (
          <TouchableOpacity
            onPress={() => setStep(step - 1)}
            activeOpacity={0.7}
            className="mt-3 items-center"
          >
            <Text className="text-body-md text-brand-300">Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
