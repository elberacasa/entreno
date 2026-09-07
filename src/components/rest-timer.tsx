import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, IconButton, Row, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
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
    setEndsAt((e) => (e == null || e < Date.now() ? Date.now() + seconds * 1000 : e + seconds * 1000));
  }, []);

  return { remaining, total, start, stop, add };
}

export function RestTimerBar({ timer }: { timer: RestTimer }) {
  const c = useTheme();
  if (timer.remaining == null) return null;

  const done = timer.remaining === 0;
  const progress = timer.total > 0 ? 1 - timer.remaining / timer.total : 1;

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: Radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: done ? c.accent : c.border,
        padding: Spacing.three,
        gap: Spacing.two,
      }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="caption" dim style={{ textTransform: 'uppercase' }}>
          {done ? '¡Descanso terminado!' : 'Descanso'}
        </Text>
        <Row gap={Spacing.three}>
          <Text variant="title" accent={done}>
            {formatDuration(timer.remaining)}
          </Text>
          <IconButton name="close-circle" size={22} onPress={timer.stop} />
        </Row>
      </Row>

      <View style={{ height: 4, borderRadius: 2, backgroundColor: c.surface2, overflow: 'hidden' }}>
        <View
          style={{
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            height: '100%',
            backgroundColor: c.accent,
          }}
        />
      </View>

      <Row gap={Spacing.two}>
        <Button title="+30 s" variant="secondary" small style={{ flex: 1 }} onPress={() => timer.add(30)} />
        <Button title="+1 min" variant="secondary" small style={{ flex: 1 }} onPress={() => timer.add(60)} />
        <Button title="Saltar" variant="secondary" small style={{ flex: 1 }} onPress={timer.stop} />
      </Row>
    </View>
  );
}
