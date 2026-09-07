import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing, TabBarHeight } from '@/constants/theme';

/**
 * Espacio que hay que dejar al final de un scroll para que la barra de
 * pestañas no tape la última tarjeta.
 */
export function useTabBarPadding(extra: number = Spacing.five): number {
  const insets = useSafeAreaInsets();
  return TabBarHeight + insets.bottom + extra;
}
