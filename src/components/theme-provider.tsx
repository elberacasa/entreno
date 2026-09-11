import React, { createContext, useEffect } from 'react';
import { Colors, type Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStore } from '@/lib/store';

export const ThemeContext = createContext<Palette>(Colors.dark);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const { settings } = useStore();
  const scheme = settings.theme && settings.theme !== 'system' ? settings.theme : system;
  const dark = scheme === 'dark';
  const palette = dark ? Colors.dark : Colors.light;
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.bg);
  }, [dark, palette.bg]);
  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}
