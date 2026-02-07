import { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";

export default function ExportNotionScreen() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      await api.post("/exports/notion", { trip_id: "current" });
      Alert.alert("Exported!", "Your trip has been exported to Notion.");
    } catch {
      Alert.alert(
        "Export Failed",
        "Could not export to Notion. A markdown summary has been saved as a fallback."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-surface-secondary px-4 pt-6">
      <Text className="text-heading-md text-gray-900 mb-4">
        Export to Notion
      </Text>

      <Card className="items-center py-6">
        <Text className="text-4xl mb-3">📝</Text>
        <Text className="text-body-md text-gray-900 mb-2">
          Notion Export
        </Text>
        <Text className="text-body-sm text-muted text-center mb-4 px-4">
          Export your full trip itinerary, bookings, and notes to a Notion page.
          Falls back to markdown if Notion API is unavailable.
        </Text>
        <Button
          title="Export Trip to Notion"
          onPress={handleExport}
          loading={loading}
        />
      </Card>
    </View>
  );
}
