import { useCallback, useSyncExternalStore } from 'react';

/**
 * Reloj que se actualiza solo mientras `active` es true. Se apoya en
 * `useSyncExternalStore` para que el render siga siendo puro: la marca de
 * tiempo se redondea al intervalo, así la instantánea es estable entre ticks.
 */
export function useNow(active: boolean, intervalMs = 1000): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!active) return () => {};
      const id = setInterval(onChange, intervalMs);
      return () => clearInterval(id);
    },
    [active, intervalMs],
  );

  const snapshot = useCallback(
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    [intervalMs],
  );

  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
