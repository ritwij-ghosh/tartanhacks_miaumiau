import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export default function TripPassScreen() {
  const [loading, setLoading] = useState(false);

  const handleGeneratePass = async () => {
    setLoading(true);
    try {
      // TODO: Download .pkpass and open in native pass viewer
      const res = await api.post("/wallet/pkpass", { trip_id: "current" });
      Alert.alert("Pass Generated", "Your Apple Wallet pass is ready.");
    } catch {
      Alert.alert("Error", "Could not generate pass. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-surface-secondary">
      <View className="px-4 pt-4 pb-8">
        <Text className="text-heading-md text-gray-900 mb-4">
          Trip Pass
        </Text>

        <Card className="items-center py-8 mb-4">
          <Text className="text-4xl mb-3">📲</Text>
          <Text className="text-heading-md text-gray-900 mb-1">
            NYC Business Trip
          </Text>
          <Text className="text-body-sm text-muted mb-1">
            Jan 15 – Jan 17, 2026
          </Text>
          <Text className="text-body-sm text-muted">
            3 bookings · 2 flights
          </Text>
        </Card>

        <Button
          title="Add to Apple Wallet"
          onPress={handleGeneratePass}
          loading={loading}
        />

        <Text className="text-body-sm text-muted text-center mt-4">
          Your trip summary as an Apple Wallet pass with live updates
        </Text>
      </View>
    </ScrollView>
  );
}
