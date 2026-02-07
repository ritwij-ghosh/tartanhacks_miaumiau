/**
 * Design tokens for Travel Butler.
 * These mirror tailwind.config.js for use in JS contexts (e.g. style props).
 */

export const colors = {
  brand: {
    50: "#EEF2FF",
    100: "#E0E7FF",
    200: "#C7D2FE",
    300: "#A5B4FC",
    400: "#818CF8",
    500: "#6366F1",
    600: "#4F46E5",
    700: "#4338CA",
    800: "#3730A3",
    900: "#312E81",
  },
  surface: {
    default: "#FFFFFF",
    secondary: "#F8FAFC",
    dark: "#0F172A",
  },
  muted: "#64748B",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const typography = {
  headingXl: { fontSize: 32, lineHeight: 40, fontWeight: "700" as const },
  headingLg: { fontSize: 24, lineHeight: 32, fontWeight: "700" as const },
  headingMd: { fontSize: 20, lineHeight: 28, fontWeight: "600" as const },
  bodyLg: { fontSize: 17, lineHeight: 24 },
  bodyMd: { fontSize: 15, lineHeight: 22 },
  bodySm: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 11, lineHeight: 16 },
} as const;

export const shadows = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHover: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
