import { useColorScheme, type TextStyle } from 'react-native';

/**
 * Trinity's palette comes from the web app's design tokens: warm paper,
 * terracotta primary, amber accents, generous 24pt radii. Native surfaces
 * stay semantic in light and dark, so the app follows the system.
 */
export const palette = {
  light: {
    background: '#FBF7F1',
    surface: '#FFFFFF',
    surfaceAlt: '#F4EDE4',
    surfaceSunken: '#EFE6DA',
    text: '#1D1A16',
    textSecondary: '#6F665B',
    textTertiary: '#9A8F82',
    primary: '#B01B10',
    primaryPressed: '#8E150C',
    primarySoft: '#F7E3DE',
    onPrimary: '#FFFFFF',
    accent: '#E8703A',
    amber: '#D99A2B',
    success: '#2F7D5B',
    danger: '#B3261E',
    border: '#EADFD2',
    separator: '#E3D8CA',
    tabBar: '#FBF7F1EE',
    overlay: 'rgba(29, 26, 22, 0.42)',
  },
  dark: {
    background: '#141210',
    surface: '#1E1B18',
    surfaceAlt: '#26221E',
    surfaceSunken: '#2C2722',
    text: '#F6F0E7',
    textSecondary: '#B8AC9D',
    textTertiary: '#8A7F72',
    primary: '#F07A5E',
    primaryPressed: '#D9644A',
    primarySoft: '#3A241F',
    onPrimary: '#2A0F0B',
    accent: '#F08A55',
    amber: '#E7B45C',
    success: '#6FC49B',
    danger: '#F08A82',
    border: '#332D27',
    separator: '#2A2521',
    tabBar: '#141210EE',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
} as const;

export type ThemeColors = (typeof palette)['light'];

export const useTheme = () => {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return { colors: dark ? palette.dark : palette.light, dark };
};

/** One radius scale, used everywhere: outer cards 24, inner rows 16. */
export const radius = {
  card: 24,
  inner: 16,
  small: 12,
  pill: 999,
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

export const type: Record<
  'hero' | 'title' | 'headline' | 'body' | 'callout' | 'footnote' | 'caption' | 'numeric',
  TextStyle
> = {
  hero: { fontSize: 34, lineHeight: 39, fontWeight: '700', letterSpacing: -0.8 },
  title: { fontSize: 26, lineHeight: 31, fontWeight: '700', letterSpacing: -0.5 },
  headline: { fontSize: 19, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  numeric: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.6,
  },
};

export const shadow = {
  card: '0 10px 30px rgba(60, 42, 24, 0.07)',
  raised: '0 16px 40px rgba(60, 42, 24, 0.12)',
} as const;
