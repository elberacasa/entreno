import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import {
  Card,
  Divider,
  EmptyState,
  Row,
  Screen,
  ScreenTitle,
  SectionHeader,
  StatTile,
  Text,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTabBarPadding } from '@/hooks/use-tab-bar-padding';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDate,
  formatTime,
  num,
  sessionDistanceKm,
  sessionDurationSec,
  sessionSummary,
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

/** Icono según lo que domine la sesión: pesas, carrera o tiempo. */
function sessionIcon(s: Session): 'barbell' | 'walk' | 'stopwatch' {
  if (sessionVolume(s) > 0) return 'barbell';
  if (sessionDistanceKm(s) > 0) return 'walk';
  return 'stopwatch';
}

export default function HistoryScreen() {
  const c = useTheme();
  const bottomPadding = useTabBarPadding();
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
        contentContainerStyle={{
          padding: Spacing.four,
          gap: Spacing.three,
          paddingBottom: bottomPadding,
        }}
        showsVerticalScrollIndicator={false}>
        <ScreenTitle title="Historial" overline="Todo lo que has cerrado" />

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
            <Card style={{ gap: Spacing.five }}>
              <Row style={{ alignItems: 'flex-start' }} gap={Spacing.four}>
                <StatTile label="Entrenos" value={String(finished.length)} accent size="lg" />
                <StatTile
                  label="Volumen total"
                  value={num(toDisplayWeight(totals.volume, settings.unit) / 1000, 1)}
                  unit={settings.unit === 'kg' ? 't' : 'k lb'}
                  size="lg"
                />
              </Row>
              <Divider />
              <Row style={{ alignItems: 'flex-start' }} gap={Spacing.four}>
                <StatTile label="Distancia" value={num(totals.km, 1)} unit="km" />
                <StatTile
                  label="Tiempo entrenando"
                  value={String(Math.round(totals.time / 3600))}
                  unit="h"
                />
              </Row>
            </Card>

            {groups.map(([key, list]) => {
              const [year, month] = key.split('-').map(Number);
              return (
                <View key={key} style={{ gap: Spacing.three }}>
                  {/* El número va en el título: como acción parecería un botón. */}
                  <SectionHeader title={`${MONTHS[month]} ${year} · ${list.length}`} />
                  <Card style={{ padding: 0, overflow: 'hidden' }}>
                    {list.map((s, i) => (
                      <View key={s.id}>
                        {i > 0 ? <Divider /> : null}
                        <Pressable
                          onPress={() => router.push(`/session/${s.id}`)}
                          style={({ pressed }) => ({
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: Spacing.three,
                            padding: Spacing.four,
                            backgroundColor: pressed ? c.surface2 : 'transparent',
                          })}>
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: Radius.sm,
                              backgroundColor: c.surface2,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}>
                            <Ionicons name={sessionIcon(s)} size={17} color={c.textDim} />
                          </View>

                          <View style={{ flex: 1, gap: Spacing.half }}>
                            <Text variant="heading" numberOfLines={1}>
                              {s.name}
                            </Text>
                            <Text variant="caption" faint numberOfLines={1}>
                              {sessionSummary(s, settings.unit)}
                            </Text>
                          </View>

                          <View style={{ alignItems: 'flex-end', gap: Spacing.half }}>
                            <Text variant="caption" dim>
                              {formatDate(s.finishedAt!)}
                            </Text>
                            <Text variant="caption" faint>
                              {formatTime(s.startedAt)}
                            </Text>
                          </View>
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
