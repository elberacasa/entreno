import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card, ProgressBar, Row, Segmented, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { groupWorkload } from '@/lib/training-insights';
import { useStore } from '@/lib/store';

export function WorkloadPanel() {
  const { sessions, exercises } = useStore();
  const c = useTheme();
  const [range, setRange] = useState<'7' | '28'>('7');
  const rows = useMemo(() => {
    const until = new Date();
    const since = new Date(until);
    since.setDate(since.getDate() - Number(range) + 1);
    since.setHours(0, 0, 0, 0);
    return groupWorkload(sessions, exercises, since, until);
  }, [sessions, exercises, range]);
  const total = rows.reduce((sum, row) => sum + row.sets, 0);
  return (
    <Card style={{ padding: 22, gap: 20 }}>
      <View style={{ gap: 6 }}>
        <Text variant="title">Dónde pusiste el trabajo</Text>
        <Text dim>Series completadas por grupo de ejercicio.</Text>
      </View>
      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: '7', label: '7 días' },
          { value: '28', label: '28 días' },
        ]}
      />
      {rows.length ? (
        rows.map((row, index) => (
          <View key={row.group} style={{ gap: 8 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="label">{row.group}</Text>
              <Text variant="caption" dim>
                {row.sets} series · {Math.round((row.sets / total) * 100)}%
              </Text>
            </Row>
            <ProgressBar
              value={row.sets / total}
              height={9}
              color={index === 0 ? c.accent : c.accentDim}
            />
          </View>
        ))
      ) : (
        <Text dim>No hay series en este período. Se mostrarán después de guardar una sesión.</Text>
      )}
      <Text variant="caption" dim>
        Cada serie cuenta en el grupo principal del catálogo. Esto muestra tu distribución de
        trabajo, no el estado de recuperación de tus músculos.
      </Text>
    </Card>
  );
}
