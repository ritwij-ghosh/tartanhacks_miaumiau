import { View, Text, TouchableOpacity, Animated } from "react-native";
import { useRef, useEffect } from "react";

const PARCHMENT = "#fdf5ec";
const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";
const BLUE_ACCENT = "#112e93";
const MUTED_BLUE = "#6B7B9E";
const TEXT_DARK = "#2B2B2B";

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

const STEP_LABEL: Record<string, string> = {
  flight: "Flight",
  hotel: "Hotel",
  restaurant: "Dining",
  activity: "Activity",
  transport: "Transport",
  calendar_event: "Calendar",
  uber: "Uber",
  uber_eats: "Uber Eats",
};

export interface ItineraryStepData {
  id: string;
  order: number;
  type: string;
  title: string;
  description?: string;
  date: string;
  start_time?: string;
  end_time?: string;
  location?: { name: string; address?: string };
  agent: string;
  estimated_price_usd: number;
  notes?: string;
}

export interface ItineraryData {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  estimated_total_usd: number;
  steps: ItineraryStepData[];
  status?: string;
}

interface ItineraryCardProps {
  itinerary: ItineraryData;
  onConfirm?: () => void;
  onRequestChanges?: () => void;
  showActions?: boolean;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatTime(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
}

// Group steps by date
function groupByDate(steps: ItineraryStepData[]): Record<string, ItineraryStepData[]> {
  const groups: Record<string, ItineraryStepData[]> = {};
  for (const step of steps) {
    const key = step.date || "Unknown";
    if (!groups[key]) groups[key] = [];
    groups[key].push(step);
  }
  return groups;
}

export function ItineraryCard({
  itinerary,
  onConfirm,
  onRequestChanges,
  showActions = true,
}: ItineraryCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const grouped = groupByDate(itinerary.steps);
  const dateKeys = Object.keys(grouped).sort();

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
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
          backgroundColor: BLUE_ACCENT,
          paddingHorizontal: 20,
          paddingVertical: 18,
        }}
      >
        <Text
          style={{
            fontFamily: "Georgia",
            fontSize: 20,
            fontWeight: "700",
            color: PARCHMENT,
            marginBottom: 4,
          }}
        >
          {itinerary.title}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ fontSize: 12, color: "rgba(253, 245, 236, 0.7)" }}>📍</Text>
            <Text style={{ fontSize: 13, color: "rgba(253, 245, 236, 0.9)", fontWeight: "500" }}>
              {itinerary.destination}
            </Text>
          </View>
          <Text style={{ fontSize: 12, color: "rgba(253, 245, 236, 0.5)" }}>•</Text>
          <Text style={{ fontSize: 13, color: "rgba(253, 245, 236, 0.8)" }}>
            {formatDate(itinerary.start_date)} — {formatDate(itinerary.end_date)}
          </Text>
        </View>
      </View>

      {/* Steps grouped by day */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        {dateKeys.map((date, dateIdx) => (
          <View key={date} style={{ marginBottom: dateIdx < dateKeys.length - 1 ? 16 : 8 }}>
            {/* Day header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <View
                style={{
                  backgroundColor: "rgba(17, 46, 147, 0.06)",
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: BLUE_ACCENT,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                  }}
                >
                  {formatDate(date)}
                </Text>
              </View>
              <View
                style={{
                  flex: 1,
                  height: 1,
                  backgroundColor: "rgba(17, 46, 147, 0.08)",
                }}
              />
            </View>

            {/* Steps for this day */}
            {grouped[date].map((step, stepIdx) => (
              <View
                key={step.id || `${date}-${stepIdx}`}
                style={{
                  flexDirection: "row",
                  marginBottom: stepIdx < grouped[date].length - 1 ? 10 : 0,
                  paddingLeft: 4,
                }}
              >
                {/* Timeline dot + line */}
                <View style={{ alignItems: "center", width: 24, marginRight: 12 }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: "rgba(17, 46, 147, 0.07)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 13 }}>
                      {STEP_EMOJI[step.type] || "•"}
                    </Text>
                  </View>
                  {stepIdx < grouped[date].length - 1 && (
                    <View
                      style={{
                        width: 1.5,
                        flex: 1,
                        backgroundColor: "rgba(17, 46, 147, 0.08)",
                        marginTop: 4,
                        marginBottom: -4,
                      }}
                    />
                  )}
                </View>

                {/* Step content */}
                <View style={{ flex: 1, paddingBottom: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: TEXT_DARK,
                        flex: 1,
                      }}
                    >
                      {step.title}
                    </Text>
                    {step.estimated_price_usd > 0 && (
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: BLUE_ACCENT,
                          marginLeft: 8,
                        }}
                      >
                        ${step.estimated_price_usd.toFixed(0)}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 3 }}>
                    <View
                      style={{
                        backgroundColor: "rgba(17, 46, 147, 0.06)",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
                      }}
                    >
                      <Text style={{ fontSize: 10, color: BLUE_ACCENT, fontWeight: "600", textTransform: "uppercase" }}>
                        {STEP_LABEL[step.type] || step.type}
                      </Text>
                    </View>
                    {step.start_time && (
                      <Text style={{ fontSize: 12, color: MUTED_BLUE }}>
                        {formatTime(step.start_time)}
                        {step.end_time ? ` — ${formatTime(step.end_time)}` : ""}
                      </Text>
                    )}
                  </View>

                  {step.location?.name && (
                    <Text style={{ fontSize: 12, color: MUTED_BLUE, marginTop: 2 }}>
                      📍 {step.location.name}
                    </Text>
                  )}

                  {step.description && (
                    <Text style={{ fontSize: 12, color: "rgba(107, 123, 158, 0.8)", marginTop: 2 }} numberOfLines={2}>
                      {step.description}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Footer: total + actions */}
      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: "rgba(17, 46, 147, 0.08)",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: showActions ? 16 : 0 }}>
          <Text style={{ fontSize: 13, color: MUTED_BLUE }}>
            {itinerary.steps.length} steps
          </Text>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
            <Text style={{ fontSize: 12, color: MUTED_BLUE }}>Estimated total</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: INK_DARK,
                fontFamily: "Georgia",
              }}
            >
              ${itinerary.estimated_total_usd.toFixed(0)}
            </Text>
          </View>
        </View>

        {showActions && (
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={onRequestChanges}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: "rgba(17, 46, 147, 0.2)",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "500", color: BLUE_ACCENT }}>
                Request Changes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.7}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: BLUE_ACCENT,
                alignItems: "center",
                shadowColor: BLUE_ACCENT,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: PARCHMENT }}>
                Confirm & Book
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
}
