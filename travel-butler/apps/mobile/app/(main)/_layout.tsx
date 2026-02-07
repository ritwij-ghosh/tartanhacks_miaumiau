import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      className={`text-caption ${focused ? "text-brand-500" : "text-muted"}`}
    >
      {label}
    </Text>
  );
}

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTitleStyle: { fontWeight: "600", fontSize: 17 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0.5,
          borderTopColor: "#E2E8F0",
        },
        tabBarActiveTintColor: "#6366F1",
        tabBarInactiveTintColor: "#94A3B8",
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="💬" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="🗺" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ focused }) => (
            <TabIcon label="📋" focused={focused} />
          ),
        }}
      />
      {/* Hidden from tab bar but still navigable */}
      <Tabs.Screen
        name="itinerary"
        options={{ href: null, title: "Itinerary" }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ href: null, title: "Bookings" }}
      />
      <Tabs.Screen
        name="trip-pass"
        options={{ href: null, title: "Trip Pass" }}
      />
      <Tabs.Screen
        name="connect-google"
        options={{ href: null, title: "Connect Google" }}
      />
      <Tabs.Screen
        name="export-notion"
        options={{ href: null, title: "Export to Notion" }}
      />
    </Tabs>
  );
}
