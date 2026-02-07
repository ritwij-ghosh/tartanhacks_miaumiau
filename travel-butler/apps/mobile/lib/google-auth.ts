/**
 * Google OIDC configuration for expo-auth-session.
 *
 * SETUP REQUIRED (one-time):
 * ─────────────────────────
 * 1. Go to Google Cloud Console → APIs & Services → Credentials
 * 2. Create an OAuth 2.0 Client ID (type: "Web application")
 *    - Authorized redirect URIs:
 *        https://auth.expo.io/@your-expo-username/travel-butler   (for Expo Go)
 *        https://dczuhwkwkvtizmzwfzto.supabase.co/auth/v1/callback (for Supabase)
 * 3. Copy the Client ID → paste into .env as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
 *    Copy the Client Secret → paste into .env as GOOGLE_CLIENT_SECRET
 * 4. In Supabase Dashboard → Authentication → Providers → Google:
 *    - Toggle ON
 *    - Paste the same Client ID and Client Secret
 * 5. (Optional) Create iOS / Android client IDs for standalone builds
 *
 * OIDC scopes: openid + email + profile
 */

export const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

export const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

export const GOOGLE_ANDROID_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

/**
 * OIDC scopes requested during Google sign-in.
 * - openid: required for OIDC — provides an id_token
 * - email: user's verified email address
 * - profile: user's display name and profile picture
 */
export const GOOGLE_OIDC_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
];
