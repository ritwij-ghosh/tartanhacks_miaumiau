import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth";
import { CircleRating } from "@/components/ui/CircleRating";

const PARCHMENT = "#fdf5ec";
const INK_DARK = "#0D2B45";
const INK_LIGHT = "#1A3D5C";
const BLUE_ACCENT = "#112e93";
const MUTED_BLUE = "#6B7B9E";
const DIVIDER = "rgba(17, 46, 147, 0.08)";
const CARD_BG = "#FFFFFF";
const DANGER = "#dc2626";

const LANGUAGE_OPTIONS = ["English", "Spanish", "French", "German", "Japanese", "Korean", "Chinese", "Portuguese", "Italian", "Arabic"];
const DIETARY_OPTIONS = ["None", "Vegetarian", "Vegan", "Halal", "Gluten-free"];
const ACTIVITY_OPTIONS = ["Culture", "Outdoors", "Food", "Nightlife", "Shopping"];

/* ─── Section Header ─────────────────────────────────────── */
function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      style={{
        fontSize: 12,
        fontWeight: "600",
        color: MUTED_BLUE,
        letterSpacing: 1,
        textTransform: "uppercase",
        marginBottom: 10,
        marginTop: 28,
        paddingHorizontal: 4,
      }}
    >
      {title}
    </Text>
  );
}

/* ─── Card wrapper ───────────────────────────────────────── */
function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: CARD_BG,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(17, 46, 147, 0.08)",
        overflow: "hidden",
      }}
    >
      {children}
    </View>
  );
}

/* ─── Single row item ────────────────────────────────────── */
function SettingsRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  last = false,
  danger = false,
  right,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  last?: boolean;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: DIVIDER,
      }}
    >
      <Text style={{ fontSize: 18, marginRight: 12 }}>{icon}</Text>
      <Text
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "500",
          color: danger ? DANGER : INK_DARK,
        }}
      >
        {label}
      </Text>
      {right}
      {value ? (
        <Text style={{ fontSize: 14, color: MUTED_BLUE, marginRight: 4 }}>
          {value}
        </Text>
      ) : null}
      {showChevron && !right && (
        <Text style={{ fontSize: 14, color: "rgba(107, 123, 158, 0.5)" }}>›</Text>
      )}
    </TouchableOpacity>
  );
}

/* ─── Chip selector (reusable) ───────────────────────────── */
function ChipSelector({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        paddingHorizontal: 16,
        paddingBottom: 16,
      }}
    >
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onToggle(opt)}
            activeOpacity={0.7}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 14,
              borderWidth: 1.5,
              borderColor: isSelected ? BLUE_ACCENT : "rgba(107, 123, 158, 0.2)",
              backgroundColor: isSelected ? "rgba(17, 46, 147, 0.08)" : "rgba(255,255,255,0.6)",
              borderRadius: 20,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: isSelected ? "600" : "400",
                color: isSelected ? BLUE_ACCENT : INK_LIGHT,
              }}
            >
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*  PROFILE SCREEN                                            */
/* ═══════════════════════════════════════════════════════════ */

export default function ProfileScreen() {
  const { user, profile, signOut, updatePreferences } = useAuth();

  // Settings state
  const [language, setLanguage] = useState("English");
  const [locationSharing, setLocationSharing] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [tripReminders, setTripReminders] = useState(true);

  // Travel preferences (from onboarding)
  const [travelPace, setTravelPace] = useState(3);
  const [dietary, setDietary] = useState<string[]>([]);
  const [budget, setBudget] = useState(3);
  const [activities, setActivities] = useState<string[]>([]);

  // UI state
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load from profile
  useEffect(() => {
    if (profile?.preferences) {
      const prefs = profile.preferences as Record<string, any>;
      setTravelPace(prefs.travel_pace ?? 3);
      setDietary(prefs.dietary_restrictions ?? []);
      setBudget(prefs.budget_range ?? 3);
      setActivities(prefs.activity_preferences ?? []);
      setLanguage(prefs.language ?? "English");
      setLocationSharing(prefs.location_sharing ?? false);
      setPushNotifications(prefs.push_notifications ?? true);
      setTripReminders(prefs.trip_reminders ?? true);
    }
  }, [profile]);

  const toggleChip = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const savePreferences = async () => {
    setSaving(true);
    await updatePreferences({
      travel_pace: travelPace,
      dietary_restrictions: dietary,
      budget_range: budget,
      activity_preferences: activities,
      language,
      location_sharing: locationSharing,
      push_notifications: pushNotifications,
      trip_reminders: tripReminders,
    });
    setSaving(false);
    setEditingPrefs(false);
  };

  const saveSettings = async (overrides: Record<string, any>) => {
    const prefs = profile?.preferences as Record<string, any> ?? {};
    await updatePreferences({ ...prefs, ...overrides });
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  };

  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Traveler";
  const email = profile?.email || user?.email || "";
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;

  const paceLabel =
    travelPace <= 2 ? "Adventurous" : travelPace >= 4 ? "Relaxed" : "Balanced";
  const budgetLabel =
    budget <= 2 ? "Budget" : budget >= 4 ? "Luxury" : "Mid-range";

  return (
    <View style={{ flex: 1, backgroundColor: PARCHMENT }}>
      {/* Header */}
      <View
        style={{
          paddingTop: Platform.OS === "ios" ? 60 : 40,
          paddingHorizontal: 24,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: DIVIDER,
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
          }}
        >
          Profile
        </Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Avatar + Name card ──────────────────────────── */}
        <View
          style={{
            backgroundColor: CARD_BG,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: "rgba(17, 46, 147, 0.08)",
            padding: 20,
            flexDirection: "row",
            alignItems: "center",
            gap: 16,
          }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                borderWidth: 2,
                borderColor: "rgba(17, 46, 147, 0.1)",
              }}
            />
          ) : (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: "rgba(17, 46, 147, 0.08)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: "rgba(17, 46, 147, 0.1)",
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "700", color: BLUE_ACCENT }}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: "Georgia",
                fontSize: 20,
                fontWeight: "700",
                color: INK_DARK,
                marginBottom: 2,
              }}
            >
              {displayName}
            </Text>
            <Text style={{ fontSize: 13, color: MUTED_BLUE }}>{email}</Text>
          </View>
        </View>

        {/* ─── General Settings ────────────────────────────── */}
        <SectionHeader title="General" />
        <SettingsCard>
          <SettingsRow
            icon="🌐"
            label="Language"
            value={language}
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
          />
          {showLanguagePicker && (
            <View
              style={{
                paddingHorizontal: 16,
                paddingBottom: 12,
                paddingTop: 4,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <TouchableOpacity
                  key={lang}
                  onPress={() => {
                    setLanguage(lang);
                    setShowLanguagePicker(false);
                    saveSettings({ language: lang });
                  }}
                  activeOpacity={0.7}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 14,
                    borderRadius: 20,
                    borderWidth: 1.5,
                    borderColor: language === lang ? BLUE_ACCENT : "rgba(107,123,158,0.2)",
                    backgroundColor: language === lang ? "rgba(17,46,147,0.08)" : "transparent",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: language === lang ? "600" : "400",
                      color: language === lang ? BLUE_ACCENT : INK_LIGHT,
                    }}
                  >
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <SettingsRow
            icon="📍"
            label="Location Sharing"
            showChevron={false}
            last
            right={
              <Switch
                value={locationSharing}
                onValueChange={(val) => {
                  setLocationSharing(val);
                  saveSettings({ location_sharing: val });
                }}
                trackColor={{ false: "rgba(107,123,158,0.2)", true: "rgba(17,46,147,0.3)" }}
                thumbColor={locationSharing ? BLUE_ACCENT : "#f4f4f5"}
              />
            }
          />
        </SettingsCard>

        {/* ─── Notifications ───────────────────────────────── */}
        <SectionHeader title="Notifications" />
        <SettingsCard>
          <SettingsRow
            icon="🔔"
            label="Push Notifications"
            showChevron={false}
            right={
              <Switch
                value={pushNotifications}
                onValueChange={(val) => {
                  setPushNotifications(val);
                  saveSettings({ push_notifications: val });
                }}
                trackColor={{ false: "rgba(107,123,158,0.2)", true: "rgba(17,46,147,0.3)" }}
                thumbColor={pushNotifications ? BLUE_ACCENT : "#f4f4f5"}
              />
            }
          />
          <SettingsRow
            icon="✈️"
            label="Trip Reminders"
            showChevron={false}
            last
            right={
              <Switch
                value={tripReminders}
                onValueChange={(val) => {
                  setTripReminders(val);
                  saveSettings({ trip_reminders: val });
                }}
                trackColor={{ false: "rgba(107,123,158,0.2)", true: "rgba(17,46,147,0.3)" }}
                thumbColor={tripReminders ? BLUE_ACCENT : "#f4f4f5"}
              />
            }
          />
        </SettingsCard>

        {/* ─── Travel Preferences ──────────────────────────── */}
        <SectionHeader title="Travel Preferences" />
        <SettingsCard>
          {!editingPrefs ? (
            <>
              <SettingsRow icon="🏃" label="Travel Pace" value={paceLabel} onPress={() => setEditingPrefs(true)} />
              <SettingsRow icon="🥗" label="Dietary" value={dietary.length > 0 ? dietary.join(", ") : "None"} onPress={() => setEditingPrefs(true)} />
              <SettingsRow icon="💰" label="Budget" value={budgetLabel} onPress={() => setEditingPrefs(true)} />
              <SettingsRow
                icon="🎯"
                label="Activities"
                value={activities.length > 0 ? activities.join(", ") : "None"}
                onPress={() => setEditingPrefs(true)}
                last
              />
            </>
          ) : (
            <View style={{ padding: 16 }}>
              {/* Travel Pace */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: INK_DARK, marginBottom: 12 }}>
                🏃  Travel Pace
              </Text>
              <CircleRating value={travelPace} onChange={setTravelPace} labels={["Adventurous", "Relaxed"]} />

              {/* Dietary */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: INK_DARK, marginTop: 24, marginBottom: 12 }}>
                🥗  Dietary Preferences
              </Text>
              <ChipSelector
                options={DIETARY_OPTIONS}
                selected={dietary}
                onToggle={(item) => toggleChip(dietary, setDietary, item)}
              />

              {/* Budget */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: INK_DARK, marginTop: 8, marginBottom: 12 }}>
                💰  Budget Range
              </Text>
              <CircleRating value={budget} onChange={setBudget} labels={["Budget", "Luxury"]} />

              {/* Activities */}
              <Text style={{ fontSize: 14, fontWeight: "600", color: INK_DARK, marginTop: 24, marginBottom: 12 }}>
                🎯  Activity Preferences
              </Text>
              <ChipSelector
                options={ACTIVITY_OPTIONS}
                selected={activities}
                onToggle={(item) => toggleChip(activities, setActivities, item)}
              />

              {/* Save / Cancel */}
              <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
                <TouchableOpacity
                  onPress={() => {
                    // Reset to profile values
                    const prefs = profile?.preferences as Record<string, any> ?? {};
                    setTravelPace(prefs.travel_pace ?? 3);
                    setDietary(prefs.dietary_restrictions ?? []);
                    setBudget(prefs.budget_range ?? 3);
                    setActivities(prefs.activity_preferences ?? []);
                    setEditingPrefs(false);
                  }}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    borderWidth: 1.5,
                    borderColor: "rgba(107,123,158,0.2)",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "500", color: MUTED_BLUE }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={savePreferences}
                  disabled={saving}
                  activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: BLUE_ACCENT,
                    alignItems: "center",
                    opacity: saving ? 0.6 : 1,
                  }}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={PARCHMENT} />
                  ) : (
                    <Text style={{ fontSize: 14, fontWeight: "600", color: PARCHMENT }}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SettingsCard>

        {/* ─── Account ─────────────────────────────────────── */}
        <SectionHeader title="Account" />
        <SettingsCard>
          <SettingsRow
            icon="🚪"
            label="Sign Out"
            showChevron={false}
            danger
            last
            onPress={handleSignOut}
          />
        </SettingsCard>

        {/* Version info */}
        <Text
          style={{
            fontSize: 12,
            color: "rgba(107, 123, 158, 0.5)",
            textAlign: "center",
            marginTop: 32,
          }}
        >
          Travel Butler v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}
