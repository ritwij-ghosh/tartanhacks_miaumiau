/**
 * Auth context — provides session state and profile to the entire app.
 * Listens for Supabase auth state changes (sign-in, sign-out, token refresh).
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
import { supabase } from "./supabase";

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

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (data) {
      setProfile(data as Profile);
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
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  const updatePreferences = async (prefs: Record<string, unknown>) => {
    if (!session?.user) return;
    // Use upsert to guarantee the row exists — covers edge cases where
    // the trigger didn't fire or the profile was deleted.
    const { data } = await supabase
      .from("profiles")
      .upsert(
        { id: session.user.id, preferences: prefs },
        { onConflict: "id" }
      )
      .select()
      .single();
    if (data) setProfile(data as Profile);
  };

  const hasCompletedOnboarding =
    Object.keys(profile?.preferences ?? {}).length > 0;

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
