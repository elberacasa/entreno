import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    bg: '#F4F6F8',
    surface: '#FFFFFF',
    surface2: '#EDF0F3',
    border: '#DFE4EA',
    text: '#0F1418',
    textDim: '#5A6672',
    accent: '#E85D22',
    onAccent: '#FFFFFF',
    accentSoft: '#FDE8DE',
    success: '#059669',
    danger: '#DC2626',
    warn: '#B45309',
  },
  dark: {
    bg: '#0C0F13',
    surface: '#151A20',
    surface2: '#1D242C',
    border: '#262F39',
    text: '#EEF2F6',
    textDim: '#8D99A6',
    accent: '#FF6B35',
    onAccent: '#12161A',
    accentSoft: '#2A1A12',
    success: '#34D399',
    danger: '#F87171',
    warn: '#FBBF24',
  },
} as const;

export type Palette = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof Palette;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
  seven: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const MaxContentWidth = 800;
