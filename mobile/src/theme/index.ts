import { Platform, useColorScheme, type TextStyle } from 'react-native';

/**
 * Trinity — one identity across web and mobile.
 *
 * Near-black surfaces, hairlines instead of shadows, one accent (lime) that
 * always carries dark ink, and three radii: group / segment / pill. Colour in
 * the data is meaning: health = lime, wealth = amber, bonds = blue, loss = red.
 *
 * The app is dark-only now; `light` is kept as an alias so existing imports and
 * any future light theme still resolve.
 */

const dark = {
  background: '#070708',
  surface: '#0A0A0C',
  surfaceAlt: '#101012',
  surfaceSunken: '#17171A',
  text: '#EDEDEF',
  textSecondary: '#B4B4BB',
  textTertiary: '#8A8A92',
  textFaint: '#4E4E56',

  primary: '#C6F24E',
  primaryPressed: '#B2DE3A',
  primarySoft: '#1E2410',
  onPrimary: '#070708',

  accent: '#C6F24E',
  health: '#C6F24E',
  wealth: '#FFB020',
  bonds: '#3D7BFF',
  amber: '#FFB020',
  success: '#3CE9C2',
  danger: '#FF6B5A',

  border: '#1B1B1E',
  separator: '#17171A',
  tabBar: '#070708F2',
  overlay: 'rgba(0, 0, 0, 0.72)',
} as const;

export const palette = {
  dark,
  /** alias — the app no longer ships a light theme */
  light: dark,
} as const;

export type ThemeColors = typeof palette.dark;

export const useTheme = () => {
  // kept for API compatibility; the identity is dark-only
  useColorScheme();
  return { colors: palette.dark, dark: true };
};

/** 22 for the one container, 5 for data segments, 999 for anything you touch. */
export const radius = {
  group: 22,
  inner: 16,
  small: 8,
  segment: 5,
  pill: 999,
  /** legacy names used by existing components */
  card: 22,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  section: 32,
} as const;

const FONT = {
  regular: 'Baloo2_400Regular',
  medium: 'Baloo2_500Medium',
  semibold: 'Baloo2_600SemiBold',
  bold: 'Baloo2_700Bold',
  black: 'Baloo2_800ExtraBold',
} as const;

export const fonts = FONT;

/** One family. Hierarchy comes from size, weight and colour. */
export const type: Record<
  | 'display'
  | 'title'
  | 'headline'
  | 'body'
  | 'callout'
  | 'footnote'
  | 'caption'
  | 'numeric'
  | 'mono',
  TextStyle
> = {
  display: {
    fontSize: 58,
    lineHeight: 58,
    fontWeight: '800',
    letterSpacing: -3,
    fontFamily: FONT.black,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -1.4,
    fontFamily: FONT.black,
  },
  headline: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontFamily: FONT.bold,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    fontFamily: FONT.regular,
  },
  callout: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
    fontFamily: FONT.medium,
  },
  footnote: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    fontFamily: FONT.medium,
  },
  caption: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    fontFamily: FONT.semibold,
  },
  numeric: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: -2,
    fontFamily: FONT.black,
  },
  mono: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.6,
    fontFamily: FONT.semibold,
  },
};

/** Depth comes from hairlines. Nothing floats. */
export const shadow = {
  card: 'none',
  raised: 'none',
} as const;

/** Kept so older screens that import `hairline` keep working. */
export const hairline = { borderWidth: 1, borderColor: dark.border } as const;

export const chartColors = {
  health: dark.health,
  wealth: dark.wealth,
  bonds: dark.bonds,
  neutral: dark.textSecondary,
  accent: dark.primary,
  loss: dark.danger,
} as const;

export const platformSelect = Platform.select;
