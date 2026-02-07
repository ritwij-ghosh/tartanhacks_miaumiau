import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Animated,
  Alert,
} from "react-native";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { ItineraryCard, type ItineraryData, type ItineraryStepData } from "@/components/chat/ItineraryCard";

const PARCHMENT = "#fdf5ec";
const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";
const BLUE_ACCENT = "#112e93";
const MUTED_BLUE = "#6B7B9E";
const TEXT_DARK = "#2B2B2B";
const SUCCESS_GREEN = "#059669";

type TabType = "upcoming" | "past";

interface TripSummary {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  estimated_total_usd: number;
  status: string;
  created_at: string;
  step_count?: number;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  draft: { color: BLUE_ACCENT, bg: "rgba(17, 46, 147, 0.08)", label: "Draft" },
  confirmed: { color: "#0369a1", bg: "rgba(3, 105, 161, 0.08)", label: "Confirmed" },
  executing: { color: "#d97706", bg: "rgba(217, 119, 6, 0.08)", label: "Booking" },
  completed: { color: SUCCESS_GREEN, bg: "rgba(5, 150, 105, 0.08)", label: "Completed" },
  cancelled: { color: "#dc2626", bg: "rgba(220, 38, 38, 0.08)", label: "Cancelled" },
};

function formatDateRange(start: string, end: string): string {
  if (!start) return "";
  try {
    const s = new Date(start + "T00:00:00");
    const e = end ? new Date(end + "T00:00:00") : null;
    const startStr = s.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (e) {
      const endStr =
        s.getMonth() === e.getMonth()
          ? e.toLocaleDateString("en-US", { day: "numeric" })
          : e.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `${startStr} — ${endStr}`;
    }
    return startStr;
  } catch {
    return `${start} → ${end}`;
  }
}

function TripCard({
  trip,
  onPress,
  onDelete,
  isDeleting,
  isExpanded,
}: {
  trip: TripSummary;
  onPress?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  isExpanded?: boolean;
}) {
  const statusConfig = STATUS_CONFIG[trip.status] || STATUS_CONFIG.draft;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: isExpanded ? BLUE_ACCENT : "rgba(17, 46, 147, 0.1)",
        padding: 18,
        marginBottom: isExpanded ? 0 : 12,
        borderBottomLeftRadius: isExpanded ? 0 : 16,
        borderBottomRightRadius: isExpanded ? 0 : 16,
        shadowColor: BLUE_ACCENT,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      {/* Status badge + price */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <View
          style={{
            backgroundColor: statusConfig.bg,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: statusConfig.color,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            {statusConfig.label}
          </Text>
        </View>
        {trip.estimated_total_usd > 0 && (
          <Text style={{ fontSize: 15, fontWeight: "700", color: INK_DARK, fontFamily: "Georgia" }}>
            ${trip.estimated_total_usd.toFixed(0)}
          </Text>
        )}
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          color: TEXT_DARK,
          fontFamily: "Georgia",
          marginBottom: 4,
        }}
      >
        {trip.title}
      </Text>

      {/* Destination + dates + delete */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          {trip.destination ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 13, color: MUTED_BLUE }}>📍</Text>
              <Text style={{ fontSize: 14, color: INK_LIGHT, fontWeight: "500" }}>
                {trip.destination}
              </Text>
            </View>
          ) : null}
          {trip.start_date ? (
            <>
              <Text style={{ fontSize: 12, color: "rgba(107, 123, 158, 0.4)" }}>•</Text>
              <Text style={{ fontSize: 13, color: MUTED_BLUE }}>
                {formatDateRange(trip.start_date, trip.end_date)}
              </Text>
            </>
          ) : null}
        </View>

        {/* Delete button */}
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.();
            onDelete?.();
          }}
          activeOpacity={0.6}
          disabled={isDeleting}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(220, 38, 38, 0.06)",
            marginLeft: 8,
          }}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <Text style={{ fontSize: 15 }}>🗑️</Text>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function TripsScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("upcoming");
  const [upcomingTrips, setUpcomingTrips] = useState<TripSummary[]>([]);
  const [pastTrips, setPastTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTrip, setExpandedTrip] = useState<string | null>(null);
  const [expandedItinerary, setExpandedItinerary] = useState<ItineraryData | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchTrips = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch all plans with step counts
      const { data: plans } = await supabase
        .from("plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!plans) return;

      const upcoming: TripSummary[] = [];
      const past: TripSummary[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const plan of plans) {
        const trip: TripSummary = {
          id: plan.id,
          title: plan.title,
          destination: plan.destination || "",
          start_date: plan.start_date || "",
          end_date: plan.end_date || "",
          estimated_total_usd: parseFloat(plan.estimated_total_usd || "0"),
          status: plan.status || "draft",
          created_at: plan.created_at,
        };

        // Cancelled trips always go to past
        if (trip.status === "cancelled") {
          past.push(trip);
        } else {
          // Use end_date (or start_date) to determine if trip is upcoming or past
          const tripEndDate = trip.end_date || trip.start_date;
          if (tripEndDate) {
            const endDate = new Date(tripEndDate + "T23:59:59");
            if (endDate >= today) {
              upcoming.push(trip);
            } else {
              past.push(trip);
            }
          } else {
            // No date info — treat as upcoming
            upcoming.push(trip);
          }
        }
      }

      setUpcomingTrips(upcoming);
      setPastTrips(past);
    } catch (err) {
      console.error("Failed to fetch trips:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTrips();
  }, [fetchTrips]);

  // Fetch full itinerary details when a trip is expanded
  const handleTripPress = useCallback(
    async (tripId: string) => {
      if (expandedTrip === tripId) {
        setExpandedTrip(null);
        setExpandedItinerary(null);
        return;
      }

      setExpandedTrip(tripId);
      setLoadingDetails(true);

      try {
        const { data: steps } = await supabase
          .from("plan_steps")
          .select("*")
          .eq("plan_id", tripId)
          .order("step_order", { ascending: true });

        const trip = [...upcomingTrips, ...pastTrips].find((t) => t.id === tripId);
        if (!trip) return;

        const itinerarySteps: ItineraryStepData[] = (steps || []).map((s: any) => ({
          id: s.id,
          order: s.step_order,
          type: s.step_type || s.category || "activity",
          title: s.title,
          description: s.description,
          date: s.date || trip.start_date || "",
          start_time: s.start_time,
          end_time: s.end_time,
          location: typeof s.location === "object" && s.location ? s.location : undefined,
          agent: s.agent || "unknown_agent",
          estimated_price_usd: parseFloat(s.estimated_price_usd || "0"),
          notes: s.notes,
        }));

        setExpandedItinerary({
          id: trip.id,
          title: trip.title,
          destination: trip.destination,
          start_date: trip.start_date,
          end_date: trip.end_date,
          estimated_total_usd: trip.estimated_total_usd,
          steps: itinerarySteps,
          status: trip.status,
        });
      } catch (err) {
        console.error("Failed to fetch trip details:", err);
      } finally {
        setLoadingDetails(false);
      }
    },
    [expandedTrip, upcomingTrips, pastTrips]
  );

  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = useCallback(
    (trip: TripSummary) => {
      const isDraft = trip.status === "draft";

      const title = isDraft ? "Delete Draft?" : "Delete Trip?";
      const message = isDraft
        ? `Remove "${trip.title}" from your trips? This cannot be undone.`
        : `"${trip.title}" is a scheduled trip. Bookings made through agents may not be fully refundable.\n\nAre you sure you want to delete this trip?`;
      const buttons = isDraft
        ? [
            { text: "Cancel", style: "cancel" as const },
            {
              text: "Delete",
              style: "destructive" as const,
              onPress: () => performDelete(trip.id),
            },
          ]
        : [
            { text: "Cancel", style: "cancel" as const },
            {
              text: "Delete Anyway",
              style: "destructive" as const,
              onPress: () => performDelete(trip.id),
            },
          ];

      Alert.alert(title, message, buttons);
    },
    []
  );

  const performDelete = useCallback(
    async (tripId: string) => {
      setDeleting(tripId);
      try {
        await api.delete(`/plans/${tripId}`);
        // Remove from local state
        setUpcomingTrips((prev) => prev.filter((t) => t.id !== tripId));
        setPastTrips((prev) => prev.filter((t) => t.id !== tripId));
        if (expandedTrip === tripId) {
          setExpandedTrip(null);
          setExpandedItinerary(null);
        }
      } catch (err: any) {
        Alert.alert("Error", err.message || "Failed to delete trip");
      } finally {
        setDeleting(null);
      }
    },
    [expandedTrip]
  );

  const trips = activeTab === "upcoming" ? upcomingTrips : pastTrips;

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 60 : 40,
          paddingHorizontal: 24,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: "rgba(17, 46, 147, 0.1)",
          backgroundColor: PARCHMENT,
        }}
      >
        <Text
          style={{
            fontFamily: "Georgia",
            fontSize: 28,
            fontWeight: "700",
            color: INK_DARK,
            letterSpacing: -0.5,
            marginBottom: 16,
          }}
        >
          My Trips
        </Text>

        {/* Tab switcher */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["upcoming", "past"] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === "upcoming" ? upcomingTrips.length : pastTrips.length;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => {
                  setActiveTab(tab);
                  setExpandedTrip(null);
                  setExpandedItinerary(null);
                }}
                activeOpacity={0.8}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 12,
                  backgroundColor: isActive ? BLUE_ACCENT : "rgba(255, 255, 255, 0.4)",
                  borderWidth: 1,
                  borderColor: isActive ? BLUE_ACCENT : "rgba(107, 123, 158, 0.15)",
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: isActive ? PARCHMENT : MUTED_BLUE,
                    fontWeight: isActive ? "600" : "400",
                    textTransform: "capitalize",
                  }}
                >
                  {tab}
                </Text>
                {count > 0 && (
                  <View
                    style={{
                      backgroundColor: isActive ? "rgba(253, 245, 236, 0.2)" : "rgba(107, 123, 158, 0.1)",
                      paddingHorizontal: 6,
                      paddingVertical: 1,
                      borderRadius: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: isActive ? PARCHMENT : MUTED_BLUE,
                      }}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BLUE_ACCENT} />
        }
      >
        {loading ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <ActivityIndicator size="large" color={BLUE_ACCENT} />
          </View>
        ) : trips.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>
              {activeTab === "upcoming" ? "🧳" : "📖"}
            </Text>
            <Text
              style={{
                fontFamily: "Georgia",
                fontSize: 20,
                fontWeight: "700",
                color: INK_DARK,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {activeTab === "upcoming" ? "No upcoming trips" : "No past trips yet"}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: MUTED_BLUE,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              {activeTab === "upcoming"
                ? "Chat with Winston to plan your next adventure!"
                : "Completed trips will appear here."}
            </Text>
          </View>
        ) : (
          trips.map((trip) => {
            const isExpanded = expandedTrip === trip.id;
            return (
              <View key={trip.id} style={{ marginBottom: 12 }}>
                <TripCard
                  trip={trip}
                  onPress={() => handleTripPress(trip.id)}
                  onDelete={() => handleDelete(trip)}
                  isDeleting={deleting === trip.id}
                  isExpanded={isExpanded}
                />

                {/* Expanded itinerary details */}
                {isExpanded && (
                  <View
                    style={{
                      borderWidth: 1,
                      borderTopWidth: 0,
                      borderColor: BLUE_ACCENT,
                      borderBottomLeftRadius: 16,
                      borderBottomRightRadius: 16,
                      overflow: "hidden",
                    }}
                  >
                    {loadingDetails ? (
                      <View style={{ alignItems: "center", paddingVertical: 20, backgroundColor: "#FFFFFF" }}>
                        <ActivityIndicator size="small" color={BLUE_ACCENT} />
                      </View>
                    ) : expandedItinerary ? (
                      <ItineraryCard itinerary={expandedItinerary} showActions={false} />
                    ) : (
                      <View style={{ alignItems: "center", paddingVertical: 16, backgroundColor: "#FFFFFF" }}>
                        <Text style={{ fontSize: 13, color: MUTED_BLUE }}>
                          No itinerary details available
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
