import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar, Row, Text } from '@/components/ui';
import { Radius, Spacing, Tabular } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/format';
import { useStore } from '@/lib/store';

export interface RestTimer {
  /** Segundos que faltan, 0 cuando acaba de terminar, null si no hay cuenta. */
  remaining: number | null;
  total: number;
  start: (seconds: number) => void;
  stop: () => void;
  add: (seconds: number) => void;
}

/**
 * Cuenta atrás basada en marca de tiempo, para que no se desfase.
 *
 * El final vive en el almacén y no en el componente: en el gimnasio se sale de
 * la sesión a mirar otra cosa, o el móvil recarga la PWA, y el descanso se
 * perdía. Como ya era un epoch, basta con guardarlo y volver a leerlo; si al
 * volver ya había vencido, entra como terminado, nunca en negativo.
 */
export function useRestTimer(): RestTimer {
  const { rest, setRest } = useStore();

  // Refrescamos mientras haya una cuenta atrás en marcha.
  const now = useNow(rest != null, 250);
  const remaining =
    rest == null ? null : Math.min(rest.total, Math.max(0, Math.ceil((rest.endsAt - now) / 1000)));

  const start = useCallback(
    (seconds: number) => {
      if (!seconds || seconds <= 0) return;
      setRest({ endsAt: Date.now() + seconds * 1000, total: seconds });
    },
    [setRest],
  );

  const stop = useCallback(() => setRest(null), [setRest]);

  const add = useCallback(
    (seconds: number) => {
      if (rest == null) return;
      // Si ya había terminado, los segundos cuentan desde ahora; si no, se
      // suman a lo que quedaba.
      const from = Math.max(rest.endsAt, Date.now());
      setRest({ endsAt: from + seconds * 1000, total: rest.total + seconds });
    },
    [rest, setRest],
  );

  return { remaining, total: rest?.total ?? 0, start, stop, add };
}

/**
 * Botón de la barra. 44 px de alto: es lo mínimo para acertar con el pulgar
 * sudado, y el descanso se toca justo cuando peor pulso tienes.
 */
function TimerAction({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        height: 44,
        minWidth: 60,
        paddingHorizontal: Spacing.three,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surface3,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text variant="label" dim>
        {label}
      </Text>
    </Pressable>
  );
}

export function RestTimerBar({ timer }: { timer: RestTimer }) {
  const c = useTheme();
  if (timer.remaining == null) return null;

  const done = timer.remaining === 0;
  const progress = timer.total > 0 ? 1 - timer.remaining / timer.total : 1;

  return (
    <View
      style={{
        backgroundColor: done ? c.accentSoft : c.surface2,
        borderRadius: Radius.lg,
        borderWidth: done ? 1 : StyleSheet.hairlineWidth,
        borderColor: done ? c.accent : c.border,
        padding: Spacing.three,
        gap: Spacing.three,
      }}
    >
      {/* El final del descanso se anuncia en su propia línea y a tamaño de
          verdad. Va en `text`, no en `accent`: las series ya marcadas también
          son naranjas, así que el color solo no distinguiría nada, y encima el
          naranja apagado sobre el fondo del aviso no llegaba ni a 3,1:1. */}
      {done ? (
        <Row gap={Spacing.two}>
          <Ionicons name="checkmark-circle" size={22} color={c.accent} />
          <Text
            numberOfLines={1}
            style={{
              flexShrink: 1,
              color: c.text,
              fontSize: 18,
              fontWeight: '800',
              letterSpacing: 0.6,
            }}
          >
            Descanso terminado
          </Text>
        </Row>
      ) : null}

      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ gap: Spacing.half }}>
          {done ? null : (
            <Text variant="overline" faint>
              Descansando
            </Text>
          )}
          <Text variant="metricSm" accent={done} style={Tabular}>
            {formatDuration(timer.remaining)}
          </Text>
        </View>

        {/* Separación real entre alargar y cancelar: cancelar no tiene
            deshacer, y su zona táctil llegaba a meterse dentro de «+1 min». */}
        <Row gap={Spacing.three} style={{ flexShrink: 0 }}>
          <TimerAction label="+30 s" onPress={() => timer.add(30)} />
          <TimerAction label="+1 min" onPress={() => timer.add(60)} />
          <Pressable
            onPress={timer.stop}
            accessibilityRole="button"
            accessibilityLabel="Cancelar el descanso"
            hitSlop={0}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              borderRadius: Radius.md,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.surface3,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="close" size={22} color={c.textDim} />
          </Pressable>
        </Row>
      </Row>

      <ProgressBar value={progress} height={5} track={done ? c.surface : c.surface3} />
    </View>
  );
}
