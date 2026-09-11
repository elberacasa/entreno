import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { Brand } from '@/components/brand';
import { Button, Card, IconButton, Row, Screen, Text } from '@/components/ui';
import { WeeklyPlanner } from '@/components/weekly-planner';
import { WeekSchedule } from '@/components/week-schedule';
import { useNow } from '@/hooks/use-now';
import { useTabBarPadding } from '@/hooks/use-tab-bar-padding';
import { useTheme } from '@/hooks/use-theme';
import { sessionProgress, sessionSummary } from '@/lib/format';
import { localDay } from '@/lib/training-insights';
import { nextWeeklySession, primaryGroups } from '@/lib/weekly-plan';
import { useStore } from '@/lib/store';

export default function TodayScreen() {
  const c = useTheme();
  const store = useStore();
  const paddingBottom = useTabBarPadding();
  const { width } = useWindowDimensions();
  const now = useNow(true, 60_000);
  const today = new Date(now);
  const active = store.activeSession;
  const finished = useMemo(
    () =>
      store.sessions
        .filter((s) => s.finishedAt)
        .sort((a, b) => b.finishedAt!.localeCompare(a.finishedAt!)),
    [store.sessions],
  );
  const completedToday = finished.filter(
    (s) => localDay(new Date(s.finishedAt!)) === localDay(today),
  );
  const weekly = store.settings.weeklyPlan;
  const next = nextWeeklySession(store, today);
  const due = store.upcoming().find((item) => localDay(new Date(item.at)) <= localDay(today));
  const routine = due
    ? store.routineById(due.routineId)
    : (next?.routine ?? (!weekly ? store.routines[0] : undefined));
  const restDay = !!weekly && !next?.today && !due;
  const progress = active ? sessionProgress(active) : null;
  const start = (free = false) => {
    if (active) return router.push(`/session/${active.id}`);
    const session = store.startSession({ routineId: free ? null : routine?.id });
    if (due && !free && session.routineId === due.routineId) store.unschedule(due.id);
    router.push(`/session/${session.id}`);
  };
  if (!store.ready) return <Screen />;
  const newUser = !store.routines.length && !active && !weekly;
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: width >= 900 ? 32 : 20, gap: 26, paddingBottom }}
        showsVerticalScrollIndicator={false}
      >
        <Row style={{ justifyContent: 'space-between' }}>
          <Brand />
          <IconButton
            name="settings-outline"
            accessibilityLabel="Ajustes y copias de seguridad"
            surface
            onPress={() => router.push('/settings')}
          />
        </Row>
        {newUser ? (
          <>
            <WeeklyPlanner welcome />
            <Button
              title="Prefiero crear mi propia rutina"
              variant="ghost"
              onPress={() => router.push('/routine/new')}
            />
          </>
        ) : (
          <>
            <View style={{ gap: 5 }}>
              <Text variant="caption" dim>
                {today.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
              <Text variant="display">{active ? 'Seguimos donde lo dejaste.' : 'Hoy'}</Text>
            </View>
            {!weekly && !active ? (
              <Card tone="accent" style={{ gap: 12 }}>
                <Text variant="title">Tus rutinas necesitan una semana.</Text>
                <Text dim>
                  Genera un reparto por músculos y días de descanso. Tus rutinas guardadas se
                  conservan.
                </Text>
                <Button
                  title="Crear mi semana en un toque"
                  icon="calendar-outline"
                  onPress={() => router.push('/recommended')}
                />
              </Card>
            ) : null}
            <View style={{ flexDirection: width >= 900 ? 'row' : 'column', gap: 30 }}>
              <View style={{ flex: width >= 900 ? 1 : undefined, gap: 20 }}>
                <Card style={{ padding: 24, gap: 17, borderColor: c.accent }}>
                  <Row>
                    <Ionicons
                      name={
                        active
                          ? 'pause-circle-outline'
                          : restDay
                            ? 'sunny-outline'
                            : 'barbell-outline'
                      }
                      size={25}
                      color={c.accent}
                    />
                    <Text variant="label" accent>
                      {active
                        ? 'Sesión en curso'
                        : restDay
                          ? completedToday.length
                            ? 'Entrenamiento registrado'
                            : 'Descanso en tu plan'
                          : due
                            ? 'Sesión programada'
                            : weekly
                              ? 'Tu sesión de hoy'
                              : 'Rutina guardada'}
                    </Text>
                  </Row>
                  <Text variant="display" style={{ fontSize: 38, lineHeight: 42 }}>
                    {active?.name ??
                      (restDay
                        ? completedToday.length
                          ? 'Por hoy, hecho.'
                          : 'Hoy toca recuperar.'
                        : (routine?.name ?? 'Elige cómo entrenar.'))}
                  </Text>
                  <Text dim>
                    {active
                      ? `${progress?.done} de ${progress?.total} series registradas`
                      : restDay
                        ? next
                          ? `Próxima sesión: ${next.date.toLocaleDateString('es', { weekday: 'long' })}, ${next.routine.name}.`
                          : 'Ajusta tu semana para elegir la próxima sesión.'
                        : routine
                          ? primaryGroups(routine.items, store.exercises).join(' · ')
                          : 'Puedes preparar una semana o empezar una sesión libre.'}
                  </Text>
                  {routine && !restDay && !active ? (
                    <View style={{ gap: 8 }}>
                      {routine.items.slice(0, 3).map((item) => (
                        <Row key={item.id}>
                          <Text style={{ flex: 1 }}>
                            {store.exerciseById(item.exerciseId)?.name ?? 'Ejercicio'}
                          </Text>
                          <Text variant="caption" dim>
                            {item.sets} series
                          </Text>
                        </Row>
                      ))}
                      {routine.items.length > 3 ? (
                        <Text variant="caption" dim>
                          Y {routine.items.length - 3} ejercicios más
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                  <Button
                    title={
                      active
                        ? 'Continuar sesión'
                        : restDay
                          ? next
                            ? 'Ver próxima sesión'
                            : 'Ajustar mi semana'
                          : routine
                            ? 'Empezar sesión'
                            : 'Crear mi semana'
                    }
                    icon={restDay ? 'calendar-outline' : 'play'}
                    onPress={() => {
                      if (active) return start();
                      if (restDay)
                        return router.push(
                          next ? `/routine-preview/${next.routine.id}` : '/recommended',
                        );
                      if (routine) return start();
                      router.push('/recommended');
                    }}
                  />
                  {routine && !restDay && !active ? (
                    <Button
                      title="Ver todos los ejercicios"
                      variant="ghost"
                      small
                      onPress={() => router.push(`/routine-preview/${routine.id}`)}
                    />
                  ) : null}
                </Card>
                <Row>
                  <Button
                    title="Elegir otra sesión"
                    variant="secondary"
                    style={{ flex: 1 }}
                    onPress={() => router.push('/routines')}
                  />
                  <Button title="Sesión libre" variant="ghost" onPress={() => start(true)} />
                </Row>
                {finished[0] ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Ver última sesión"
                    onPress={() => router.push(`/summary/${finished[0].id}`)}
                    style={{
                      gap: 6,
                      paddingVertical: 14,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <Text variant="caption" dim>
                      Tu última sesión
                    </Text>
                    <Text variant="heading">{finished[0].name}</Text>
                    <Text variant="caption" dim>
                      {sessionSummary(finished[0], store.settings.unit)}
                    </Text>
                  </Pressable>
                ) : null}
                <Row>
                  <Button
                    title="Discos para la barra"
                    icon="options-outline"
                    variant="ghost"
                    small
                    onPress={() => router.push('/tools')}
                  />
                  <Button
                    title="Ejercicios"
                    icon="body-outline"
                    variant="ghost"
                    small
                    onPress={() => router.push('/exercises')}
                  />
                </Row>
              </View>
              {weekly ? (
                <View style={{ flex: width >= 900 ? 1 : undefined }}>
                  <WeekSchedule now={today} />
                </View>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
