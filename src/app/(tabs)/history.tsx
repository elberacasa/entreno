import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Card, Divider, EmptyState, Row, Screen, SectionHeader, StatTile, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDate,
  formatDuration,
  formatTime,
  num,
  setsLabel,
  sessionDistanceKm,
  sessionDurationSec,
  sessionSetCount,
  sessionVolume,
  toDisplayWeight,
} from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Session } from '@/lib/types';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function monthKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export default function HistoryScreen() {
  const c = useTheme();
  const { sessions, settings } = useStore();

  const finished = useMemo(
    () =>
      sessions
        .filter((s) => s.finishedAt)
        .sort((a, b) => +new Date(b.finishedAt!) - +new Date(a.finishedAt!)),
    [sessions],
  );

  const groups = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of finished) {
      const key = monthKey(s.finishedAt!);
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    return [...map.entries()];
  }, [finished]);

  const totals = useMemo(
    () => ({
      volume: finished.reduce((a, s) => a + sessionVolume(s), 0),
      km: finished.reduce((a, s) => a + sessionDistanceKm(s), 0),
      time: finished.reduce((a, s) => a + (sessionDurationSec(s) ?? 0), 0),
    }),
    [finished],
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.seven }}
        showsVerticalScrollIndicator={false}>
        <Text variant="display">Historial</Text>

        {finished.length === 0 ? (
          <Card>
            <EmptyState
              icon="calendar-outline"
              title="Historial vacío"
              hint="Aquí verás cada entreno que cierres, con sus series, pesos y kilómetros."
            />
          </Card>
        ) : (
          <>
            <Card>
              <Row style={{ alignItems: 'flex-start' }}>
                <StatTile label="Entrenos" value={String(finished.length)} accent />
                <StatTile
                  label="Volumen"
                  value={num(toDisplayWeight(totals.volume, settings.unit) / 1000, 1)}
                  unit={settings.unit === 'kg' ? 't' : 'k lb'}
                />
                <StatTile label="Distancia" value={num(totals.km, 1)} unit="km" />
                <StatTile label="Tiempo" value={`${Math.round(totals.time / 3600)}`} unit="h" />
              </Row>
            </Card>

            {groups.map(([key, list]) => {
              const [year, month] = key.split('-').map(Number);
              return (
                <View key={key} style={{ gap: Spacing.three }}>
                  <SectionHeader title={`${MONTHS[month]} ${year} · ${list.length}`} />
                  <Card style={{ padding: 0 }}>
                    {list.map((s, i) => (
                      <View key={s.id}>
                        {i > 0 ? <Divider /> : null}
                        <Pressable
                          onPress={() => router.push(`/session/${s.id}`)}
                          style={({ pressed }) => ({
                            padding: Spacing.four,
                            backgroundColor: pressed ? c.surface2 : 'transparent',
                            gap: Spacing.one,
                          })}>
                          <Row style={{ justifyContent: 'space-between' }}>
                            <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
                              {s.name}
                            </Text>
                            <Text variant="caption" dim>
                              {formatDate(s.finishedAt!)}
                            </Text>
                          </Row>
                          <Text variant="caption" dim>
                            {[
                              formatTime(s.startedAt),
                              // Entrenos importados o de duración cero no la muestran.
                              sessionDurationSec(s) ? formatDuration(sessionDurationSec(s)) : null,
                              setsLabel(sessionSetCount(s)),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                          <Row gap={Spacing.three} style={{ marginTop: Spacing.one }}>
                            {sessionVolume(s) > 0 ? (
                              <Text variant="caption" accent>
                                {num(toDisplayWeight(sessionVolume(s), settings.unit), 0)}{' '}
                                {settings.unit}
                              </Text>
                            ) : null}
                            {sessionDistanceKm(s) > 0 ? (
                              <Text variant="caption" accent>
                                {num(sessionDistanceKm(s), 2)} km
                              </Text>
                            ) : null}
                          </Row>
                        </Pressable>
                      </View>
                    ))}
                  </Card>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
