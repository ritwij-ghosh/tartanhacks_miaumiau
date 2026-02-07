import { useState } from "react";
import { View, Text } from "react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import * as Linking from "expo-linking";

export default function ConnectGoogleScreen() {
  const [connected, setConnected] = useState(false);

  const handleConnect = async () => {
    try {
      const res = await api.get("/oauth/google/start");
      // Open OAuth URL in browser
      await Linking.openURL(res.auth_url);
      // TODO: Listen for deep-link callback to confirm connection
      setConnected(true);
    } catch {
      // TODO: Show toast error
    }
  };

  return (
    <View className="flex-1 bg-surface-secondary px-4 pt-6">
      <Text className="text-heading-md text-gray-900 mb-4">
        Connect Google
      </Text>

      <Card className="items-center py-6">
        <Text className="text-4xl mb-3">📅</Text>
        <Text className="text-body-md text-gray-900 mb-2">
          Google Calendar
        </Text>
        <Text className="text-body-sm text-muted text-center mb-4 px-4">
          Connect your Google account to export trip events directly to your
          calendar.
        </Text>
        <Button
          title={connected ? "Connected ✓" : "Connect Google Account"}
          onPress={handleConnect}
          variant={connected ? "secondary" : "primary"}
        />
      </Card>
    </View>
  );
}
