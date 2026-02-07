import { View, Text, Animated } from "react-native";
import { useState, useEffect, useRef } from "react";
import type { ItineraryStepData, ItineraryData } from "./ItineraryCard";

const PARCHMENT = "#fdf5ec";
const INK_DARK = "#0D2B45";
const BLUE_ACCENT = "#112e93";
const MUTED_BLUE = "#6B7B9E";
const TEXT_DARK = "#2B2B2B";
const SUCCESS_GREEN = "#059669";

const STEP_EMOJI: Record<string, string> = {
  flight: "✈️",
  hotel: "🏨",
  restaurant: "🍽️",
  activity: "🎯",
  transport: "🚗",
  calendar_event: "📅",
  uber: "🚕",
  uber_eats: "🍔",
};

const AGENT_DISPLAY: Record<string, { name: string; action: string }> = {
  flight_agent: { name: "Flight Agent", action: "Searching flights..." },
  hotel_agent: { name: "Hotel Agent", action: "Finding hotels..." },
  dining_agent: { name: "Dining Agent", action: "Reserving table..." },
  places_agent: { name: "Places Agent", action: "Looking up venue..." },
  directions_agent: { name: "Directions Agent", action: "Planning route..." },
  gcal_agent: { name: "Calendar Agent", action: "Creating event..." },
  uber_agent: { name: "Uber Agent", action: "Booking ride..." },
  uber_eats_agent: { name: "Uber Eats Agent", action: "Placing order..." },
  unknown_agent: { name: "Agent", action: "Processing..." },
};

interface ExecutionAnimationProps {
  itinerary: ItineraryData;
  onComplete?: () => void;
}

interface StepState {
  status: "waiting" | "processing" | "done";
  fadeAnim: Animated.Value;
  scaleAnim: Animated.Value;
  checkAnim: Animated.Value;
}

export function ExecutionAnimation({ itinerary, onComplete }: ExecutionAnimationProps) {
  const [stepStates, setStepStates] = useState<StepState[]>([]);
  const [allDone, setAllDone] = useState(false);
  const containerFade = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const doneRef = useRef(false);

  useEffect(() => {
    // Initialize step states
    const states: StepState[] = itinerary.steps.map(() => ({
      status: "waiting" as const,
      fadeAnim: new Animated.Value(0.4),
      scaleAnim: new Animated.Value(0.95),
      checkAnim: new Animated.Value(0),
    }));
    setStepStates(states);

    // Fade in container
    Animated.timing(containerFade, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // Animate steps sequentially
    const runSequence = async () => {
      for (let i = 0; i < states.length; i++) {
        // Mark as processing
        states[i].status = "processing";
        setStepStates([...states]);

        // Animate processing state
        Animated.parallel([
          Animated.timing(states[i].fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(states[i].scaleAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        // Simulate processing delay (400ms-800ms per step)
        await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));

        // Mark as done
        states[i].status = "done";
        setStepStates([...states]);

        // Animate checkmark
        Animated.spring(states[i].checkAnim, {
          toValue: 1,
          friction: 6,
          tension: 120,
          useNativeDriver: true,
        }).start();

        // Small pause between steps
        await new Promise((r) => setTimeout(r, 200));
      }

      // All done!
      setAllDone(true);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }).start();

      // Give the user time to see the success state
      await new Promise((r) => setTimeout(r, 800));
      if (!doneRef.current) {
        doneRef.current = true;
        onComplete?.();
      }
    };

    // Start after a brief delay
    setTimeout(runSequence, 500);
  }, []);

  return (
    <Animated.View
      style={{
        opacity: containerFade,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(17, 46, 147, 0.12)",
        overflow: "hidden",
        shadowColor: BLUE_ACCENT,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 3,
      }}
    >
      {/* Header */}
      <View
        style={{
          backgroundColor: INK_DARK,
          paddingHorizontal: 20,
          paddingVertical: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: "rgba(253, 245, 236, 0.15)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 16 }}>⚡</Text>
        </View>
        <View>
          <Text
            style={{
              fontFamily: "Georgia",
              fontSize: 17,
              fontWeight: "700",
              color: PARCHMENT,
            }}
          >
            Booking Your Trip
          </Text>
          <Text style={{ fontSize: 12, color: "rgba(253, 245, 236, 0.7)", marginTop: 2 }}>
            {itinerary.title} — {itinerary.destination}
          </Text>
        </View>
      </View>

      {/* Steps */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 14 }}>
        {itinerary.steps.map((step, idx) => {
          const state = stepStates[idx];
          if (!state) return null;

          const agentInfo = AGENT_DISPLAY[step.agent] || AGENT_DISPLAY.unknown_agent;
          const isDone = state.status === "done";
          const isProcessing = state.status === "processing";

          return (
            <Animated.View
              key={step.id || idx}
              style={{
                opacity: state.fadeAnim,
                transform: [{ scale: state.scaleAnim }],
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 10,
                paddingHorizontal: 8,
                marginBottom: idx < itinerary.steps.length - 1 ? 2 : 0,
                borderRadius: 10,
                backgroundColor: isDone
                  ? "rgba(5, 150, 105, 0.04)"
                  : isProcessing
                  ? "rgba(17, 46, 147, 0.04)"
                  : "transparent",
              }}
            >
              {/* Step icon */}
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isDone
                    ? "rgba(5, 150, 105, 0.1)"
                    : "rgba(17, 46, 147, 0.06)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 12,
                }}
              >
                {isDone ? (
                  <Animated.Text
                    style={{
                      fontSize: 14,
                      transform: [{ scale: state.checkAnim }],
                    }}
                  >
                    ✅
                  </Animated.Text>
                ) : (
                  <Text style={{ fontSize: 13 }}>
                    {STEP_EMOJI[step.type] || "•"}
                  </Text>
                )}
              </View>

              {/* Content */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: isDone ? SUCCESS_GREEN : TEXT_DARK,
                  }}
                >
                  {step.title}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: isDone ? "rgba(5, 150, 105, 0.7)" : MUTED_BLUE,
                    marginTop: 1,
                  }}
                >
                  {isDone ? `${agentInfo.name} — Complete` : isProcessing ? agentInfo.action : `${agentInfo.name} — Pending`}
                </Text>
              </View>

              {/* Processing spinner */}
              {isProcessing && !isDone && (
                <Text style={{ fontSize: 14, marginLeft: 8 }}>⏳</Text>
              )}
            </Animated.View>
          );
        })}
      </View>

      {/* Success banner */}
      {allDone && (
        <Animated.View
          style={{
            transform: [{ scale: successScale }],
            backgroundColor: "rgba(5, 150, 105, 0.06)",
            borderTopWidth: 1,
            borderTopColor: "rgba(5, 150, 105, 0.1)",
            paddingVertical: 16,
            paddingHorizontal: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 24, marginBottom: 6 }}>🎉</Text>
          <Text
            style={{
              fontFamily: "Georgia",
              fontSize: 16,
              fontWeight: "700",
              color: SUCCESS_GREEN,
              marginBottom: 4,
            }}
          >
            Trip Booked Successfully!
          </Text>
          <Text style={{ fontSize: 13, color: MUTED_BLUE, textAlign: "center" }}>
            {itinerary.steps.length} agents dispatched — all tasks completed.
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}
