import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://dczuhwkwkvtizmzwfzto.supabase.co";
const SUPABASE_ANON_KEY = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjenVod2t3a3Z0aXptendmenRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0MzIxOTQsImV4cCI6MjA4NjAwODE5NH0.EjgleFezC8k4mmIO_9OYQuPr1njFuy7VOS2GJzTtpY8";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // important for React Native
  },
});
