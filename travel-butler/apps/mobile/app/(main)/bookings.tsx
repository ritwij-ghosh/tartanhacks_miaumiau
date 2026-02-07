import { View, Text, ScrollView } from "react-native";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

export default function BookingsScreen() {
  // TODO: Fetch bookings from backend /bookings/status
  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      <View className="px-4 pt-4 pb-8">
        <Text className="text-heading-md text-gray-900 mb-4">
          Bookings
        </Text>

        <Card className="mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Chip label="Hotel" variant="green" />
            <Text className="text-body-sm text-green-600 font-medium">Confirmed</Text>
          </View>
          <Text className="text-body-md text-gray-900">
            The Standard, High Line
          </Text>
          <Text className="text-body-sm text-muted mt-1">
            Jan 15 – Jan 17 · 2 nights · $342
          </Text>
        </Card>

        <Card className="mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Chip label="Dinner" variant="amber" />
            <Text className="text-body-sm text-amber-600 font-medium">Pending</Text>
          </View>
          <Text className="text-body-md text-gray-900">
            Le Bernardin
          </Text>
          <Text className="text-body-sm text-muted mt-1">
            Jan 15, 7:30 PM · 2 guests
          </Text>
        </Card>

        <Text className="text-body-sm text-muted text-center mt-6">
          Bookings appear here after you approve them in Chat
        </Text>
      </View>
    </ScrollView>
  );
}
