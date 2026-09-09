import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Mantiene la pantalla encendida mientras `active` sea true.
 *
 * En mitad de un entreno la pantalla se apaga sola entre serie y serie, y hay
 * que desbloquear el móvil con las manos llenas de magnesio para ver cuánto
 * queda de descanso.
 *
 * Notas de la API, que tiene más aristas de las que parece:
 *
 * - Se comprueba que exista antes de llamarla. Safari solo la trae desde iOS
 *   16.4, y sin comprobarlo el `catch` llegaría tarde.
 * - `request()` rechaza si el documento no está visible, así que hay que
 *   mirarlo antes de pedirlo, no después.
 * - iOS suelta el bloqueo al pasar la app a segundo plano y no lo devuelve al
 *   volver: por eso se vuelve a pedir en cada `visibilitychange`. Sin esto
 *   funciona una vez y deja de funcionar en cuanto miras un mensaje.
 *
 * No se usa `expo-keep-awake` aunque soporte web: su implementación pide el
 * bloqueo una sola vez, sin `try/catch` y sin reintentar al volver de segundo
 * plano, que es justo el caso del gimnasio.
 */
export function useKeepAwake(active: boolean) {
  useEffect(() => {
    // Hoy solo se ejecuta la web (la PWA instalada también es web). En nativo
    // haría falta el módulo correspondiente, y esa rama no la prueba nadie.
    if (!active || Platform.OS !== 'web') return;
    if (typeof document === 'undefined' || typeof navigator === 'undefined') return;
    if (!('wakeLock' in navigator)) return;

    let cancelled = false;
    let sentinel: WakeLockSentinel | null = null;

    const request = async () => {
      if (cancelled) return;
      if (document.visibilityState !== 'visible') return;
      if (sentinel && !sentinel.released) return;
      try {
        const granted = await navigator.wakeLock.request('screen');
        if (cancelled) {
          void granted.release().catch(() => {});
          return;
        }
        sentinel = granted;
        // El sistema puede soltarlo por su cuenta (batería baja, ahorro de
        // energía). Si pasa, que el siguiente intento no lo dé por vivo.
        granted.addEventListener('release', () => {
          if (sentinel === granted) sentinel = null;
        });
      } catch {
        // Batería baja, permiso denegado o el navegador no quiere. No hay plan
        // B posible: la pantalla se apagará como siempre.
        sentinel = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      void sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [active]);
}
