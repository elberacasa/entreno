import '@/global.css';

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

/**
 * Paleta oscura primero: fondo casi negro, superficies escalonadas para dar
 * profundidad y el naranja reservado para lo accionable y los récords. El tema
 * claro replica los mismos papeles para que ningún componente tenga que saber
 * en qué modo está.
 */
export const Colors = {
  light: {
    bg: '#F1F3F6',
    surface: '#FFFFFF',
    surface2: '#E9EDF2',
    surface3: '#DEE4EB',
    border: '#D7DDE5',
    borderStrong: '#B9C3CF',
    text: '#0A0D11',
    textDim: '#586474',
    textFaint: '#626E7E',
    accent: '#DC4708',
    accentDim: '#F0A283',
    accentSoft: '#FCE7DC',
    onAccent: '#FFFFFF',
    success: '#047857',
    danger: '#C81E1E',
    warn: '#A15C07',
    shadow: '#0A0D11',
    scrim: 'rgba(10, 13, 17, 0.45)',
  },
  dark: {
    bg: '#08090C',
    surface: '#111419',
    surface2: '#191D25',
    surface3: '#232833',
    border: '#242A34',
    borderStrong: '#3A414F',
    text: '#F4F7FA',
    textDim: '#B1BAC8',
    textFaint: '#939EAF',
    accent: '#FF5A1F',
    accentDim: '#8A3411',
    accentSoft: '#26120A',
    onAccent: '#0A0B0E',
    success: '#2DD46F',
    danger: '#F26B6B',
    warn: '#FBBF24',
    shadow: '#000000',
    scrim: 'rgba(0, 0, 0, 0.7)',
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

/**
 * Cifras con ancho fijo. Sin esto, un cronómetro o una tabla de series bailan
 * de lado cada vez que cambia un dígito.
 */
export const Tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/** Sombra suave; en web react-native-web la traduce a box-shadow. */
export function elevation(level: 1 | 2 | 3, color: string): ViewStyle {
  const [opacity, radius, offset] = {
    1: [0.18, 8, 2],
    2: [0.28, 18, 6],
    3: [0.4, 30, 12],
  }[level];

  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: offset },
    elevation: offset,
  };
}

/** Alto de la barra de pestañas sin contar el área segura de abajo. */
export const TabBarHeight = 58;

export const MaxContentWidth = 800;
