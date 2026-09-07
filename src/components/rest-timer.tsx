import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconButton, ProgressBar, Row, Text } from '@/components/ui';
import { Radius, Spacing, Tabular } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration } from '@/lib/format';

export interface RestTimer {
  /** Segundos que faltan, 0 cuando acaba de terminar, null si no hay cuenta. */
  remaining: number | null;
  total: number;
  start: (seconds: number) => void;
  stop: () => void;
  add: (seconds: number) => void;
}

/** Cuenta atrás basada en marca de tiempo, para que no se desfase. */
export function useRestTimer(): RestTimer {
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  // Refrescamos mientras haya una cuenta atrás en marcha.
  const now = useNow(endsAt != null, 250);
  const remaining = endsAt == null ? null : Math.max(0, Math.ceil((endsAt - now) / 1000));

  const start = useCallback((seconds: number) => {
    if (!seconds || seconds <= 0) return;
    setTotal(seconds);
    setEndsAt(Date.now() + seconds * 1000);
  }, []);

  const stop = useCallback(() => {
    setEndsAt(null);
    setTotal(0);
  }, []);

  const add = useCallback((seconds: number) => {
    setTotal((t) => t + seconds);
    setEndsAt((e) =>
      e == null || e < Date.now() ? Date.now() + seconds * 1000 : e + seconds * 1000,
    );
  }, []);

  return { remaining, total, start, stop, add };
}

/** Botoncito compacto; en la barra inferior el espacio es oro. */
function TimerAction({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        height: 30,
        paddingHorizontal: Spacing.three,
        borderRadius: Radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: c.surface3,
        opacity: pressed ? 0.7 : 1,
      })}>
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
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: done ? c.accent : c.border,
        padding: Spacing.three,
        gap: Spacing.three,
      }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ gap: Spacing.half }}>
          <Text variant="overline" faint>
            {done ? 'Descanso terminado' : 'Descansando'}
          </Text>
          <Text variant="metricSm" accent={done} style={Tabular}>
            {formatDuration(timer.remaining)}
          </Text>
        </View>
        <Row gap={Spacing.two} style={{ flexShrink: 0 }}>
          <TimerAction label="+30 s" onPress={() => timer.add(30)} />
          <TimerAction label="+1 min" onPress={() => timer.add(60)} />
          <IconButton name="close-circle" size={24} onPress={timer.stop} />
        </Row>
      </Row>

      <ProgressBar
        value={progress}
        height={5}
        track={done ? c.surface : c.surface3}
      />
    </View>
  );
}
