import React, { createContext } from 'react';

import { Colors, type Palette } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Un único punto de lectura del tema del sistema.
 *
 * Antes cada componente llamaba a `useColorScheme()` por su cuenta, con una
 * suscripción propia: al cambiar el móvil de claro a oscuro con la app abierta
 * unas partes se actualizaban y otras no, y la pantalla quedaba a medias
 * (tarjetas oscuras sobre fondo claro). Con un contexto solo hay una
 * suscripción y todo cambia a la vez.
 */
export const ThemeContext = createContext<Palette>(Colors.dark);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const palette = scheme === 'dark' ? Colors.dark : Colors.light;

  return <ThemeContext.Provider value={palette}>{children}</ThemeContext.Provider>;
}
