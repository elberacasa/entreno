import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Badge,
  Button,
  Card,
  Divider,
  IconButton,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  StatTile,
  Text,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTabBarPadding } from '@/hooks/use-tab-bar-padding';
import { useTheme } from '@/hooks/use-theme';
import {
  daysUntil,
  exercisesLabel,
  formatDuration,
  formatWhen,
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
  const now = useNow(true, 60_000);

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
        showsVerticalScrollIndicator={false}
      >
        <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
          <Row style={{ flex: 1 }} gap={8}>
            <Ionicons name="barbell" size={26} color={c.accent} />
            <Text variant="heading" style={{ fontSize: 22, letterSpacing: -0.8 }}>
              entreno
            </Text>
          </Row>
          <IconButton
            name="settings-outline"
            accessibilityLabel="Ajustes y copias de seguridad"
            surface
            onPress={() => router.push('/settings')}
          />
        </Row>
        <View style={{ gap: 6, marginBottom: 8 }}>
          <Text variant="caption" dim>
            {today}
          </Text>
          <Text variant="display" style={{ fontSize: 36, lineHeight: 40 }}>
            {activeSession
              ? 'Sigue donde lo dejaste.'
              : finished.length
                ? 'Haz espacio para ti.'
                : 'Tu próximo paso empieza aquí.'}
          </Text>
        </View>
        <WeekStrip sessions={finished} now={now} />

        {activeSession ? (
          <ActiveSessionCard session={activeSession} now={now} />
        ) : (
          <StartCard routines={routines} onStart={begin} />
        )}

        <Agenda />

        {finished.length > 0 ? (
          <View style={{ gap: 16, paddingVertical: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="heading">Tu semana</Text>
              <Text variant="caption" dim>
                {settings.profile
                  ? `${week?.sessions ?? 0} de ${settings.profile.daysPerWeek} entrenos`
                  : 'Cada sesión cuenta'}
              </Text>
            </Row>
            {settings.profile ? (
              <ProgressBar
                value={(week?.sessions ?? 0) / settings.profile.daysPerWeek}
                height={6}
              />
            ) : null}
            <Row style={{ alignItems: 'flex-start' }}>
              <StatTile label="Entrenos" value={String(week?.sessions ?? 0)} accent />
              <StatTile label="Semanas seguidas" value={String(streak)} />
              {(week?.volumeKg ?? 0) > 0 ? (
                <StatTile
                  label={`Volumen (${settings.unit})`}
                  value={num(toDisplayWeight(week?.volumeKg ?? 0, settings.unit), 0)}
                />
              ) : (
                <StatTile label="Distancia (km)" value={num(week?.distanceKm ?? 0, 1)} />
              )}
            </Row>
          </View>
        ) : null}

        <SectionHeader
          title="Últimos entrenos"
          action={finished.length > 0 ? 'Ver todo' : undefined}
          onAction={() => router.push('/history')}
        />

        {recent.length === 0 ? (
          <View style={{ paddingVertical: 16, gap: 8 }}>
            <Text variant="heading">El progreso empieza con una sesión.</Text>
            <Text dim style={{ lineHeight: 22 }}>
              Aquí verás lo que hiciste y cómo vas avanzando. Empieza con un plan o entrena a tu
              manera.
            </Text>
          </View>
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
                  })}
                >
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
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.accent }} />
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
  const { exerciseById, sessions } = useStore();
  const lastRoutine = sessions.find((session) => session.finishedAt)?.routineId;
  const nextIndex = routines.findIndex((routine) => routine.id === lastRoutine);
  const next = routines.length ? routines[(nextIndex + 1) % routines.length] : undefined;

  if (!next)
    return (
      <Card style={{ padding: 24, gap: 20, borderRadius: 24, borderColor: c.borderStrong }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: c.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="compass-outline" size={28} color={c.accent} />
        </View>
        <View style={{ gap: 8 }}>
          <Text variant="title" style={{ fontSize: 27 }}>
            Un plan que encaje contigo.
          </Text>
          <Text dim style={{ lineHeight: 23 }}>
            Tu experiencia, tu material y tu tiempo. Prepara tu semana sin empezar de cero.
          </Text>
        </View>
        <Button
          title="Encontrar mi plan"
          icon="arrow-forward"
          onPress={() => router.push('/recommended')}
        />
        <Button
          title="Explorar rutinas"
          variant="secondary"
          onPress={() => router.push('/routine-catalog')}
        />
        <Button title="Entrenar a mi manera" variant="ghost" onPress={() => onStart()} />
      </Card>
    );

  const sets = next.items.reduce((sum, item) => sum + item.sets, 0);
  return (
    <Card style={{ padding: 24, gap: 20, borderRadius: 24, borderColor: c.borderStrong }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Badge
          label={routines.length > 1 ? 'Siguiente en tus rutinas' : 'Tu rutina lista'}
          tone="accent"
        />
        <Ionicons name="barbell-outline" size={24} color={c.accent} />
      </Row>
      <View style={{ gap: 8 }}>
        <Text variant="display">{next.name}</Text>
        <Text dim>
          {exercisesLabel(next.items.length)} · {setsLabel(sets)}
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        {next.items.slice(0, 3).map((item) => (
          <Row key={item.id} gap={10}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: c.textFaint }} />
            <Text style={{ flex: 1 }}>{exerciseById(item.exerciseId)?.name ?? 'Ejercicio'}</Text>
            <Text variant="caption" dim>
              {setsLabel(item.sets)}
            </Text>
          </Row>
        ))}
        {next.items.length > 3 ? (
          <Text variant="caption" dim>
            Y {next.items.length - 3} ejercicios más
          </Text>
        ) : null}
      </View>
      <Button title="Empezar entrenamiento" icon="play" onPress={() => onStart(next.id)} />
      <Row>
        <Button
          title="Elegir otra"
          variant="secondary"
          style={{ flex: 1 }}
          onPress={() => router.push('/routines')}
        />
        <Button
          title="Entreno libre"
          variant="ghost"
          style={{ flex: 1 }}
          onPress={() => onStart()}
        />
      </Row>
    </Card>
  );
}

function WeekStrip({
  sessions,
  now,
}: {
  sessions: ReturnType<typeof useStore>['sessions'];
  now: number;
}) {
  const c = useTheme();
  const today = new Date(now);
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - ((today.getDay() + 6) % 7),
  );
  const key = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const trained = new Set(sessions.map((session) => key(new Date(session.finishedAt!))));
  return (
    <Row gap={6} style={{ paddingVertical: 8, marginBottom: 12 }}>
      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        const done = trained.has(key(date));
        const current = key(date) === key(today);
        return (
          <View
            key={index}
            accessibilityLabel={`${date.toLocaleDateString('es', { weekday: 'long' })}, ${done ? 'entrenamiento completado' : current ? 'hoy' : 'sin entreno'}`}
            style={{ flex: 1, alignItems: 'center', gap: 9 }}
          >
            <Text variant="caption" dim>
              {label}
            </Text>
            <View
              style={{
                width: 36,
                height: 40,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: done ? c.accent : current ? c.surface2 : 'transparent',
                borderWidth: current ? 1 : 0,
                borderColor: c.accent,
              }}
            >
              {done ? (
                <Ionicons name="checkmark" size={20} color={c.onAccent} />
              ) : (
                <Text variant="label" accent={current}>
                  {date.getDate()}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </Row>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.five,
    gap: Spacing.three,
  },
});

/**
 * Lo que hay puesto en la agenda. Lo atrasado no se esconde: se marca y se
 * queda ahí hasta que lo hagas o lo quites.
 */
function Agenda() {
  const c = useTheme();
  const store = useStore();
  const items = store.upcoming();

  if (items.length === 0) return null;

  const startScheduled = (scheduleId: string, routineId: string) => {
    const session = store.startSession({ routineId });
    store.unschedule(scheduleId);
    router.push(`/session/${session.id}`);
  };

  return (
    <>
      <SectionHeader title="Agenda" />
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {items.slice(0, 5).map((item, i) => {
          const routine = store.routineById(item.routineId);
          const days = daysUntil(item.at);
          const late = days < 0;
          const today = days === 0;

          return (
            <View key={item.id}>
              {i > 0 ? <Divider /> : null}
              <Row gap={Spacing.three} style={{ padding: Spacing.four, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: Radius.sm,
                    backgroundColor: late || today ? c.accentSoft : c.surface2,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={late ? 'alert-circle' : 'calendar'}
                    size={18}
                    color={late || today ? c.accent : c.textDim}
                  />
                </View>

                <View style={{ flex: 1, gap: Spacing.one }}>
                  <Text variant="heading" numberOfLines={1}>
                    {routine?.name ?? 'Rutina'}
                  </Text>
                  <Row gap={Spacing.two}>
                    <Text variant="caption" dim>
                      {formatWhen(item.at)}
                    </Text>
                    {late ? <Badge label="Sin hacer" tone="accent" /> : null}
                  </Row>
                  {(today || late) && !store.activeSession ? (
                    <Button
                      title="Empezar ahora"
                      icon="play"
                      small
                      style={{ alignSelf: 'flex-start', marginTop: Spacing.one }}
                      onPress={() => startScheduled(item.id, item.routineId)}
                    />
                  ) : null}
                </View>

                <IconButton name="close" size={18} onPress={() => store.unschedule(item.id)} />
              </Row>
            </View>
          );
        })}
      </Card>
    </>
  );
}
