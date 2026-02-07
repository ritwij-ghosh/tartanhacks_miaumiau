/**
 * Auth context — provides session state and profile to the entire app.
 * Listens for Supabase auth state changes (sign-in, sign-out, token refresh).
 * Persists onboarding completion in AsyncStorage so it's only shown once.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { type Session, type User } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const ONBOARDING_KEY = "travel_butler_onboarding_completed";

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  provider: string;
  preferences: Record<string, unknown>;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  hasCompletedOnboarding: boolean;
  signOut: () => Promise<void>;
  updatePreferences: (prefs: Record<string, unknown>) => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  hasCompletedOnboarding: false,
  signOut: async () => {},
  updatePreferences: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  // Check AsyncStorage for cached onboarding flag on mount
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      if (val === "true") setOnboardingDone(true);
    });
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data as Profile);
      // If profile has preferences, mark onboarding as done locally too
      if (Object.keys((data as Profile).preferences ?? {}).length > 0) {
        setOnboardingDone(true);
        AsyncStorage.setItem(ONBOARDING_KEY, "true");
      }
    } else if (error?.code === "PGRST116") {
      // No profile row exists — create one so updates/upserts work later
      const user = (await supabase.auth.getUser()).data.user;
      const newProfile: Partial<Profile> = {
        id: userId,
        email: user?.email ?? null,
        full_name: user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? null,
        avatar_url: user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? null,
        provider: user?.app_metadata?.provider ?? "email",
        preferences: {},
      };
      const { data: created } = await supabase
        .from("profiles")
        .upsert(newProfile)
        .select()
        .single();
      if (created) setProfile(created as Profile);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // Wait for fetchProfile to complete before clearing loading
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    // Don't clear onboarding flag — if they sign back in, don't re-ask
  };

  const updatePreferences = async (prefs: Record<string, unknown>) => {
    if (!session?.user) return;
    const { data } = await supabase
      .from("profiles")
      .upsert(
        { id: session.user.id, preferences: prefs },
        { onConflict: "id" }
      )
      .select()
      .single();
    if (data) {
      setProfile(data as Profile);
      // Persist onboarding completion locally
      setOnboardingDone(true);
      await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    }
  };

  const hasCompletedOnboarding =
    onboardingDone || Object.keys(profile?.preferences ?? {}).length > 0;

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        hasCompletedOnboarding,
        signOut,
        updatePreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
