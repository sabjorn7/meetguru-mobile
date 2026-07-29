import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/** Blue-accented palette (adapted from an orange e-learning reference). */
export const colors = {
  primary: '#2563eb',
  primaryDark: '#1d4ed8',
  primaryTint: '#dbeafe', // filled tinted surfaces (icon circles, active pills)
  primarySoft: '#eff6ff', // very light wash (promo banner, active tab bg)

  bg: '#f4f5f7', // app background — makes white cards float
  card: '#ffffff',
  border: '#eceef1',
  hairline: '#e5e7eb',

  ink: '#0f172a', // headings
  body: '#334155', // body text
  muted: '#64748b', // secondary text
  faint: '#94a3b8', // placeholders / tertiary

  success: '#16a34a',
  danger: '#dc2626',
  amber: '#f59e0b',

  white: '#ffffff',
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/** Raleway family (matches the website). Loaded in the root layout. */
export const fonts = {
  regular: 'Raleway_400Regular',
  medium: 'Raleway_500Medium',
  semibold: 'Raleway_600SemiBold',
  bold: 'Raleway_700Bold',
  extrabold: 'Raleway_800ExtraBold',
} as const;

/** Soft card shadow used across surfaces. */
export const shadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  android: { elevation: 3 },
  default: {},
}) as ViewStyle;

/** Typography presets (font family + size + line height + color). */
export const text = {
  h1: { fontFamily: fonts.extrabold, fontSize: 28, lineHeight: 34, color: colors.ink },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.ink },
  title: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.ink },
  subtitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.body },
  bodyMedium: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.body },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, color: colors.muted },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20, color: colors.white },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof text;
