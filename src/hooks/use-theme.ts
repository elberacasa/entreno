import { useContext } from 'react';

import { ThemeContext } from '@/components/theme-provider';
import type { Palette } from '@/constants/theme';

/** Paleta activa. La decide `AppThemeProvider`, una sola vez para toda la app. */
export function useTheme(): Palette {
  return useContext(ThemeContext);
}
