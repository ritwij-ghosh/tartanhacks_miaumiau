import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Set to true during development to skip auth and go straight to Chat
const DEV_SKIP_AUTH = __DEV__;

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (DEV_SKIP_AUTH) {
      setAuthed(true);
      setChecked(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setChecked(true);
    });
  }, []);

  if (!checked) return null;

  if (authed) return <Redirect href="/(main)/chat" />;
  return <Redirect href="/(auth)/sign-in" />;
}
