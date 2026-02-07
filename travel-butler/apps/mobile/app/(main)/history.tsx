import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  status: string;
  estimated_total_usd: number | null;
}

const STATUS_VARIANT: Record<string, "green" | "red" | "gray"> = {
  completed: "green",
  cancelled: "red",
};

export default function HistoryScreen() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("plans")
      .select("id, title, destination, start_date, end_date, status, estimated_total_usd")
      .eq("user_id", user.id)
      .in("status", ["completed", "cancelled"])
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setTrips((data as Trip[]) ?? []);
        setLoading(false);
      });
  }, [user]);

  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      <View className="px-4 pt-4 pb-8">
        <Text className="text-heading-md text-gray-900 mb-4">
          Past Trips
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#6366F1" className="mt-12" />
        ) : trips.length === 0 ? (
          <View className="items-center mt-12">
            <Text className="text-body-lg text-muted text-center">
              No past trips yet
            </Text>
          </View>
        ) : (
          trips.map((trip) => (
            <Card key={trip.id} className="mb-3">
              <View className="flex-row items-center justify-between mb-2">
                <Chip
                  label={trip.status}
                  variant={STATUS_VARIANT[trip.status] ?? "gray"}
                />
                {trip.estimated_total_usd != null && (
                  <Text className="text-body-sm text-muted">
                    ${trip.estimated_total_usd.toFixed(0)}
                  </Text>
                )}
              </View>
              <Text className="text-body-md text-gray-900 font-medium">
                {trip.title}
              </Text>
              {trip.destination && (
                <Text className="text-body-sm text-muted mt-1">
                  {trip.destination}
                </Text>
              )}
              {trip.start_date && (
                <Text className="text-body-sm text-muted mt-0.5">
                  {trip.start_date}
                  {trip.end_date ? ` → ${trip.end_date}` : ""}
                </Text>
              )}
            </Card>
          ))
        )}
      </View>
    </ScrollView>
  );
}
