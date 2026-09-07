import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  IconButton,
  ProgressBar,
  Row,
  Screen,
  ScreenTitle,
  SectionHeader,
  StatTile,
  Text,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTabBarPadding } from '@/hooks/use-tab-bar-padding';
import { useTheme } from '@/hooks/use-theme';
import {
  exercisesLabel,
  formatDuration,
  num,
  relativeDay,
  sessionProgress,
  sessionSummary,
  setsLabel,
  toDisplayWeight,
} from '@/lib/format';
import { weeklyTotals, weekStreak } from '@/lib/stats';
import { useStore } from '@/lib/store';
import type { Routine } from '@/lib/types';

export default function TodayScreen() {
  const c = useTheme();
  const bottomPadding = useTabBarPadding();
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

  const today = new Date(now).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}>
        <ScreenTitle
          title="Hoy"
          overline={today}
          right={
            <IconButton
              name="settings-outline"
              size={20}
              surface
              onPress={() => router.push('/settings')}
            />
          }
        />

        {activeSession ? (
          <ActiveSessionCard session={activeSession} now={now} />
        ) : (
          <StartCard routines={routines} onStart={begin} />
        )}

        <SectionHeader title="Esta semana" />
        <Card style={{ gap: Spacing.five }}>
          <Row style={{ alignItems: 'flex-start' }} gap={Spacing.four}>
            <StatTile
              label="Entrenos"
              value={String(week?.sessions ?? 0)}
              accent
              size="lg"
            />
            <StatTile
              label={`Volumen (${settings.unit})`}
              value={num(toDisplayWeight(week?.volumeKg ?? 0, settings.unit), 0)}
              size="lg"
            />
          </Row>
          <Divider />
          <Row style={{ alignItems: 'flex-start' }} gap={Spacing.four}>
            <StatTile label="Distancia" value={num(week?.distanceKm ?? 0, 1)} unit="km" />
            <StatTile
              label="Racha"
              value={String(streak)}
              unit={streak === 1 ? 'semana' : 'semanas'}
            />
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
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {recent.map((s, i) => (
              <View key={s.id}>
                {i > 0 ? <Divider /> : null}
                <Pressable
                  onPress={() => router.push(`/session/${s.id}`)}
                  style={({ pressed }) => ({
                    padding: Spacing.four,
                    gap: Spacing.one,
                    backgroundColor: pressed ? c.surface2 : 'transparent',
                  })}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
                      {s.name}
                    </Text>
                    <Text variant="caption" faint>
                      {relativeDay(s.finishedAt!)}
                    </Text>
                  </Row>
                  <Text variant="caption" dim numberOfLines={1}>
                    {sessionSummary(s, settings.unit)}
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

/** Tarjeta destacada del entreno abierto: cronómetro grande y avance de series. */
function ActiveSessionCard({
  session,
  now,
}: {
  session: NonNullable<ReturnType<typeof useStore>['activeSession']>;
  now: number;
}) {
  const c = useTheme();
  const open = () => router.push(`/session/${session.id}`);
  const { done, total } = sessionProgress(session);
  const elapsed = (now - new Date(session.startedAt).getTime()) / 1000;

  return (
    <Pressable onPress={open}>
      <Card raised style={{ borderColor: c.accent, gap: Spacing.four }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={Spacing.two}>
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }}
            />
            <Text variant="overline" accent>
              En curso
            </Text>
          </Row>
          <Text variant="metricSm" accent>
            {formatDuration(elapsed)}
          </Text>
        </Row>

        <View style={{ gap: Spacing.two }}>
          <Text variant="title" numberOfLines={1}>
            {session.name}
          </Text>
          <ProgressBar value={total > 0 ? done / total : 0} height={6} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="caption" dim>
              {done} de {total} series
            </Text>
            <Text variant="caption" dim>
              {exercisesLabel(session.entries.length)}
            </Text>
          </Row>
        </View>

        <Button title="Continuar entrenamiento" icon="play" onPress={open} />
      </Card>
    </Pressable>
  );
}

/** Punto de partida cuando no hay nada abierto: rutinas listas para lanzar. */
function StartCard({
  routines,
  onStart,
}: {
  routines: Routine[];
  onStart: (routineId?: string) => void;
}) {
  const c = useTheme();
  const { exerciseById } = useStore();

  return (
    <Card style={{ gap: Spacing.four }}>
      <View style={{ gap: Spacing.two }}>
        <Text variant="title">Empezar a entrenar</Text>
        <Text variant="body" dim style={{ lineHeight: 21 }}>
          {routines.length > 0
            ? 'Carga una rutina y solo tendrás que ir marcando series.'
            : 'Todavía no tienes rutinas. Crea una o empieza un entreno vacío e ve añadiendo ejercicios sobre la marcha.'}
        </Text>
      </View>

      {routines.length > 0 ? (
        <View style={{ gap: Spacing.two }}>
          {routines.slice(0, 4).map((r) => {
            const sets = r.items.reduce((acc, i) => acc + (i.sets || 0), 0);
            const first = r.items[0] ? exerciseById(r.items[0].exerciseId) : undefined;
            return (
              <Pressable
                key={r.id}
                onPress={() => onStart(r.id)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  backgroundColor: pressed ? c.surface3 : c.surface2,
                  borderRadius: Radius.md,
                  padding: Spacing.three,
                })}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: Radius.sm,
                    backgroundColor: c.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons
                    name={first?.kind === 'cardio' ? 'walk' : 'barbell'}
                    size={19}
                    color={c.accent}
                  />
                </View>
                <View style={{ flex: 1, gap: Spacing.half }}>
                  <Text variant="heading" numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text variant="caption" faint numberOfLines={1}>
                    {exercisesLabel(r.items.length)} · {setsLabel(sets)}
                  </Text>
                </View>
                <Ionicons name="play-circle" size={30} color={c.accent} />
              </Pressable>
            );
          })}
          {routines.length > 4 ? (
            <Row style={{ justifyContent: 'center', paddingTop: Spacing.one }}>
              <Badge label={`+${routines.length - 4} más en Rutinas`} />
            </Row>
          ) : null}
        </View>
      ) : null}

      <Row gap={Spacing.two}>
        <Button
          title="Entreno vacío"
          icon="add"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => onStart()}
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
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
});
