import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Divider,
  EmptyState,
  IconButton,
  Row,
  Screen,
  SectionHeader,
  StatTile,
  Text,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDuration,
  exercisesLabel,
  num,
  setsLabel,
  relativeDay,
  sessionDistanceKm,
  sessionDurationSec,
  sessionSetCount,
  sessionVolume,
  toDisplayWeight,
} from '@/lib/format';
import { weeklyTotals, weekStreak } from '@/lib/stats';
import { useStore } from '@/lib/store';

export default function TodayScreen() {
  const c = useTheme();
  const { ready, activeSession, sessions, routines, startSession, settings } = useStore();

  // El reloj solo corre cuando hay un entreno abierto.
  const now = useNow(Boolean(activeSession));

  const finished = useMemo(() => sessions.filter((s) => s.finishedAt), [sessions]);
  const week = useMemo(() => weeklyTotals(finished, 1)[0], [finished]);
  const streak = useMemo(() => weekStreak(finished), [finished]);
  const recent = finished.slice(0, 3);

  const begin = (routineId?: string) => {
    const session = startSession({ routineId: routineId ?? null });
    router.push(`/session/${session.id}`);
  };

  if (!ready) return <Screen />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Text variant="caption" dim style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              {new Date(now).toLocaleDateString('es-ES', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            <Text variant="display">Hoy</Text>
          </View>
          <IconButton name="settings-outline" size={24} onPress={() => router.push('/settings')} />
        </Row>

        {activeSession ? (
          <Pressable onPress={() => router.push(`/session/${activeSession.id}`)}>
            <Card style={{ borderColor: c.accent, gap: Spacing.three }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Row gap={Spacing.two}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />
                  <Text variant="caption" accent style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                    En curso
                  </Text>
                </Row>
                <Text variant="mono" dim>
                  {formatDuration((now - new Date(activeSession.startedAt).getTime()) / 1000)}
                </Text>
              </Row>
              <Text variant="title">{activeSession.name}</Text>
              <Text variant="body" dim>
                {setsLabel(sessionSetCount(activeSession))} hechas ·{' '}
                {exercisesLabel(activeSession.entries.length)}
              </Text>
              <Button title="Continuar entrenamiento" icon="play" onPress={() => router.push(`/session/${activeSession.id}`)} />
            </Card>
          </Pressable>
        ) : (
          <Card style={{ gap: Spacing.three }}>
            <Text variant="heading">Empezar a entrenar</Text>
            {routines.length > 0 ? (
              <>
                <Text variant="body" dim>
                  Carga una rutina y solo tendrás que ir marcando series.
                </Text>
                <View style={{ gap: Spacing.two }}>
                  {routines.slice(0, 4).map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => begin(r.id)}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: Spacing.three,
                        backgroundColor: pressed ? c.border : c.surface2,
                        borderRadius: Radius.md,
                        padding: Spacing.three,
                      })}>
                      <Ionicons name="barbell" size={18} color={c.accent} />
                      <View style={{ flex: 1 }}>
                        <Text variant="body">{r.name}</Text>
                        <Text variant="caption" dim>
                          {exercisesLabel(r.items.length)}
                        </Text>
                      </View>
                      <Ionicons name="play-circle" size={24} color={c.accent} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Text variant="body" dim>
                Todavía no tienes rutinas. Puedes crear una o empezar un entreno vacío e ir
                añadiendo ejercicios sobre la marcha.
              </Text>
            )}
            <Row gap={Spacing.two}>
              <Button
                title="Entreno vacío"
                icon="add"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => begin()}
              />
              <Button
                title="Nueva rutina"
                icon="create-outline"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push('/routine/new')}
              />
            </Row>
          </Card>
        )}

        <SectionHeader title="Esta semana" />
        <Card>
          <Row style={{ alignItems: 'flex-start' }}>
            <StatTile label="Entrenos" value={String(week?.sessions ?? 0)} accent />
            <StatTile
              label="Volumen"
              value={num(toDisplayWeight(week?.volumeKg ?? 0, settings.unit), 0)}
              unit={settings.unit}
            />
            <StatTile label="Distancia" value={num(week?.distanceKm ?? 0, 1)} unit="km" />
            <StatTile label="Racha" value={String(streak)} unit={streak === 1 ? 'sem' : 'sems'} />
          </Row>
        </Card>

        <SectionHeader
          title="Últimos entrenos"
          action={finished.length > 0 ? 'Ver todo' : undefined}
          onAction={() => router.push('/history')}
        />

        {recent.length === 0 ? (
          <Card>
            <EmptyState
              icon="stopwatch-outline"
              title="Aún no hay entrenos"
              hint="Cuando termines tu primera sesión aparecerá aquí junto a tus totales."
            />
          </Card>
        ) : (
          <Card style={{ padding: 0 }}>
            {recent.map((s, i) => (
              <View key={s.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => router.push(`/session/${s.id}`)}
                  style={({ pressed }) => ({
                    padding: Spacing.four,
                    backgroundColor: pressed ? c.surface2 : 'transparent',
                  })}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text variant="body">{s.name}</Text>
                    <Text variant="caption" dim>
                      {relativeDay(s.finishedAt!)}
                    </Text>
                  </Row>
                  <Text variant="caption" dim style={{ marginTop: Spacing.one }}>
                    {setsLabel(sessionSetCount(s))} ·{' '}
                    {num(toDisplayWeight(sessionVolume(s), settings.unit), 0)} {settings.unit}
                    {sessionDistanceKm(s) > 0 ? ` · ${num(sessionDistanceKm(s), 1)} km` : ''}
                    {sessionDurationSec(s) ? ` · ${formatDuration(sessionDurationSec(s))}` : ''}
                  </Text>
                </Pressable>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.seven,
  },
});
