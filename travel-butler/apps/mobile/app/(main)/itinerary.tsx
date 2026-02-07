import { View, Text, ScrollView } from "react-native";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";

export default function ItineraryScreen() {
  // TODO: Fetch itinerary from backend /plans/generate
  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      <View className="px-4 pt-4 pb-8">
        <Text className="text-heading-md text-gray-900 mb-4">
          Your Itinerary
        </Text>

        <Card className="mb-3">
          <View className="flex-row items-center mb-2">
            <Chip label="Flight" variant="brand" />
            <Text className="text-body-sm text-muted ml-2">8:00 AM</Text>
          </View>
          <Text className="text-body-md text-gray-900">
            SFO → JFK · United UA 234
          </Text>
          <Text className="text-body-sm text-muted mt-1">
            Terminal 3 · Gate B22
          </Text>
        </Card>

        <Card className="mb-3">
          <View className="flex-row items-center mb-2">
            <Chip label="Layover" variant="amber" />
            <Text className="text-body-sm text-muted ml-2">2:30 PM</Text>
          </View>
          <Text className="text-body-md text-gray-900">
            3h layover at JFK
          </Text>
          <Text className="text-body-sm text-muted mt-1">
            Suggested: TWA Hotel lounge · 10 min walk from T5
          </Text>
        </Card>

        <Text className="text-body-sm text-muted text-center mt-6">
          Chat with Butler to build your itinerary
        </Text>
      </View>
    </ScrollView>
  );
}
