import { Tabs } from "expo-router";
import { View, Text, Image, Platform, ImageSourcePropType } from "react-native";

const PARCHMENT = "#fdf5ec";
const BLUE_ACCENT = "#112e93";
const MUTED_BLUE = "#6B7B9E";

function TabIcon({
  icon,
  image,
  label,
  focused,
}: {
  icon?: string;
  image?: ImageSourcePropType;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 4 }}>
      {image ? (
        <Image
          source={image}
          style={{
            width: 24,
            height: 24,
            marginBottom: 2,
            opacity: focused ? 1 : 0.5,
            tintColor: focused ? BLUE_ACCENT : MUTED_BLUE,
          }}
          resizeMode="contain"
        />
      ) : (
        <Text style={{ fontSize: 20, marginBottom: 2 }}>{icon}</Text>
      )}
      <Text
        numberOfLines={1}
        style={{
          fontSize: 9,
          fontWeight: focused ? "600" : "400",
          color: focused ? BLUE_ACCENT : MUTED_BLUE,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: PARCHMENT,
          borderTopWidth: 1,
          borderTopColor: "rgba(17, 46, 147, 0.1)",
          height: Platform.OS === "ios" ? 85 : 65,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 4,
          elevation: 0,
          shadowColor: BLUE_ACCENT,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: BLUE_ACCENT,
        tabBarInactiveTintColor: MUTED_BLUE,
      }}
    >
      <Tabs.Screen
        name="chat"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon image={require("@/assets/winston_message.png")} label="Chat" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon image={require("@/assets/winston_trips.png")} label="Trips" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label="Profile" focused={focused} />
          ),
        }}
      />
      {/* Hidden screens — still navigable but not in tab bar */}
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="history" options={{ href: null }} />
      <Tabs.Screen name="itinerary" options={{ href: null }} />
      <Tabs.Screen name="bookings" options={{ href: null }} />
      <Tabs.Screen name="trip-pass" options={{ href: null }} />
      <Tabs.Screen name="connect-google" options={{ href: null }} />
      <Tabs.Screen name="export-notion" options={{ href: null }} />
    </Tabs>
  );
}
