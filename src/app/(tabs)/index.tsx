import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';

import { Brand, BrandMark } from '@/components/brand';
import { Button, Card, IconButton, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { useNow } from '@/hooks/use-now';
import { useTabBarPadding } from '@/hooks/use-tab-bar-padding';
import { useTheme } from '@/hooks/use-theme';
import {
  exercisesLabel,
  setsLabel,
  formatDuration,
  num,
  relativeDay,
  sessionProgress,
  sessionSummary,
  sessionDurationSec,
  toDisplayWeight,
} from '@/lib/format';
import { weeklyTotals } from '@/lib/stats';
import { activityByDay, localDay } from '@/lib/training-insights';
import { useStore } from '@/lib/store';

export default function TodayScreen() {
  const c = useTheme();
  const store = useStore();
  const { width } = useWindowDimensions();
  const paddingBottom = useTabBarPadding();
  const now = useNow(true, 60_000);
  const finished = useMemo(() => store.sessions.filter((s) => s.finishedAt), [store.sessions]);
  const week = useMemo(() => weeklyTotals(finished, 1)[0], [finished]);
  const days = useMemo(() => activityByDay(finished), [finished]);
  const today = new Date(now);
  const todayKey = localDay(today);
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - ((today.getDay() + 6) % 7),
  );
  const due = store.upcoming().find((item) => localDay(new Date(item.at)) <= todayKey);
  const lastRoutine = finished[0]?.routineId;
  const nextIndex = store.routines.findIndex((r) => r.id === lastRoutine);
  const routine =
    (due ? store.routineById(due.routineId) : undefined) ??
    store.routines[(nextIndex + 1) % store.routines.length];
  const active = store.activeSession;
  const progress = active ? sessionProgress(active) : null;
  const goal = store.settings.profile?.daysPerWeek;
  const start = (freestyle = false) => {
    if (active) return router.push(`/session/${active.id}`);
    const session = store.startSession({ routineId: freestyle ? null : routine?.id });
    if (due && !freestyle && session.routineId === due.routineId) store.unschedule(due.id);
    router.push(`/session/${session.id}`);
  };
  if (!store.ready) return <Screen />;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: width >= 900 ? 32 : 20, paddingBottom, gap: 28 }}
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
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text variant="display" style={{ fontSize: 50, lineHeight: 54 }}>
            Entrenar
          </Text>
          <Text variant="caption" dim style={{ paddingBottom: 5 }}>
            {today.toLocaleDateString('es', { day: 'numeric', month: 'long' })}
          </Text>
        </Row>
        <Row gap={6}>
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label, index) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            const key = localDay(date);
            const done = days.has(key);
            const current = key === todayKey;
            const planned = store.schedule.some((item) => localDay(new Date(item.at)) === key);
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${date.toLocaleDateString('es', { weekday: 'long', day: 'numeric' })}, ${done ? 'entrenamiento registrado' : planned ? 'rutina programada' : 'ver historial'}`}
                onPress={() => router.push({ pathname: '/history', params: { date: key } })}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  gap: 8,
                  paddingVertical: 10,
                  borderRadius: 16,
                  backgroundColor: current ? c.surface2 : 'transparent',
                  borderWidth: current ? 1 : 0,
                  borderColor: c.borderStrong,
                }}
              >
                <Text variant="caption" dim>
                  {label}
                </Text>
                <Text variant="heading" style={{ fontSize: 17 }}>
                  {date.getDate()}
                </Text>
                <View
                  style={{
                    height: 6,
                    width: 6,
                    borderRadius: 3,
                    backgroundColor: done ? c.success : planned ? c.accent : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </Row>
        <View
          style={{ flexDirection: width >= 900 ? 'row' : 'column', gap: 28, alignItems: 'stretch' }}
        >
          <View style={{ flex: width >= 900 ? 1.25 : undefined, gap: 18 }}>
            <View
              style={{
                backgroundColor: '#244CE8',
                borderRadius: 26,
                padding: 24,
                gap: 22,
                overflow: 'hidden',
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  right: -22,
                  top: -4,
                  opacity: 0.13,
                  transform: [{ rotate: '-8deg' }],
                }}
              >
                <BrandMark size={220} color="#FFFFFF" />
              </View>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="label" style={{ color: '#FFFFFF' }}>
                  {active
                    ? 'Sesión en curso'
                    : due
                      ? 'Programada para ti'
                      : routine
                        ? 'Tu próxima sesión'
                        : 'Tu gimnasio. Tu plan.'}
                </Text>
                <Ionicons
                  name={active ? 'radio-button-on' : 'barbell-outline'}
                  size={23}
                  color="#FFFFFF"
                />
              </Row>
              <View style={{ gap: 8 }}>
                <Text variant="display" style={{ color: '#FFFFFF', fontSize: 48, lineHeight: 50 }}>
                  {active?.name ?? routine?.name ?? 'Empecemos\ncon un buen plan.'}
                </Text>
                <Text style={{ color: '#E0E8FF' }}>
                  {active
                    ? `${progress?.done} de ${progress?.total} series registradas`
                    : routine
                      ? `${exercisesLabel(routine.items.length)} · ${setsLabel(routine.items.reduce((sum, item) => sum + item.sets, 0))}`
                      : 'Elige tus días, tu material y tu objetivo. Las rutinas quedan listas para entrenar.'}
                </Text>
              </View>
              {routine && !active ? (
                <View style={{ gap: 12, paddingVertical: 4 }}>
                  {routine.items.slice(0, 3).map((item, index) => (
                    <Row key={item.id} gap={12}>
                      <Text variant="caption" style={{ color: '#D8E3FF', width: 18 }}>
                        {index + 1}
                      </Text>
                      <Text style={{ flex: 1, color: '#FFFFFF' }} numberOfLines={1}>
                        {store.exerciseById(item.exerciseId)?.name ?? 'Ejercicio'}
                      </Text>
                      <Text variant="caption" style={{ color: '#D8E3FF' }}>
                        {item.sets} series
                      </Text>
                    </Row>
                  ))}
                  {routine.items.length > 3 ? (
                    <Text variant="caption" style={{ color: '#D8E3FF' }}>
                      Y {routine.items.length - 3} ejercicios más
                    </Text>
                  ) : null}
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  active ? 'Continuar sesión' : routine ? 'Empezar sesión' : 'Preparar mi plan'
                }
                onPress={() => (active || routine ? start() : router.push('/recommended'))}
                style={({ pressed }) => ({
                  minHeight: 56,
                  paddingHorizontal: 20,
                  borderRadius: 14,
                  backgroundColor: pressed ? '#DAE3FF' : '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                })}
              >
                <Text variant="heading" style={{ color: '#173CBA' }}>
                  {active ? 'Continuar sesión' : routine ? 'Empezar sesión' : 'Preparar mi plan'}
                </Text>
                <Ionicons name="arrow-forward" size={22} color="#173CBA" />
              </Pressable>
            </View>
            <Row gap={10}>
              <Button
                title={routine ? 'Cambiar rutina' : 'Explorar planes'}
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => router.push(routine ? '/routines' : '/routine-catalog')}
              />
              <Button
                title="Sesión libre"
                variant="ghost"
                style={{ flex: 1 }}
                onPress={() => start(true)}
              />
            </Row>
            <View style={{ gap: 2 }}>
              <ToolRow
                title="Calculadora de discos"
                detail="Prepara la barra en segundos"
                icon="options-outline"
                onPress={() => router.push('/tools')}
              />
              <ToolRow
                title="Biblioteca de ejercicios"
                detail={`${store.exercises.length} movimientos y demostraciones`}
                icon="body-outline"
                onPress={() => router.push('/exercises')}
              />
            </View>
          </View>
          <View style={{ flex: width >= 900 ? 1 : undefined, gap: 22 }}>
            <View style={{ gap: 14 }}>
              <SectionHeader
                title="Esta semana"
                action="Ver progreso"
                onAction={() => router.push('/progress')}
              />
              <Row style={{ alignItems: 'flex-end' }}>
                <Text variant="metric" style={{ fontSize: 56, lineHeight: 60 }}>
                  {week?.sessions ?? 0}
                </Text>
                <Text dim style={{ flex: 1, paddingBottom: 8 }}>
                  {goal ? `de ${goal} sesiones previstas` : 'sesiones completadas'}
                </Text>
              </Row>
              {goal ? (
                <Row gap={6}>
                  {Array.from({ length: goal }, (_, i) => (
                    <View
                      key={i}
                      style={{
                        height: 8,
                        flex: 1,
                        borderRadius: 4,
                        backgroundColor: i < (week?.sessions ?? 0) ? c.accent : c.surface3,
                      }}
                    />
                  ))}
                </Row>
              ) : null}
              <Row style={{ paddingTop: 4 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="title">
                    {formatDuration(
                      finished
                        .filter(
                          (s) =>
                            new Date(s.finishedAt!) >= monday && new Date(s.finishedAt!) <= today,
                        )
                        .reduce((sum, s) => sum + (sessionDurationSec(s) ?? 0), 0),
                    )}
                  </Text>
                  <Text variant="caption" dim>
                    Tiempo registrado
                  </Text>
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="title">
                    {num(toDisplayWeight(week?.volumeKg ?? 0, store.settings.unit), 0)}{' '}
                    <Text variant="caption" dim>
                      {store.settings.unit}
                    </Text>
                  </Text>
                  <Text variant="caption" dim>
                    Volumen de carga
                  </Text>
                </View>
              </Row>
            </View>
            <View style={{ gap: 12 }}>
              <SectionHeader
                title="Últimas sesiones"
                action={finished.length ? 'Ver todas' : undefined}
                onAction={() => router.push('/history')}
              />
              {finished.length ? (
                finished.slice(0, 3).map((session) => (
                  <Pressable
                    key={session.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ${session.name}, ${relativeDay(session.finishedAt!)}`}
                    onPress={() => router.push(`/summary/${session.id}`)}
                    style={({ pressed }) => ({
                      paddingVertical: 15,
                      borderBottomWidth: 1,
                      borderColor: c.border,
                      opacity: pressed ? 0.65 : 1,
                    })}
                  >
                    <Row>
                      <View style={{ flex: 1, gap: 5 }}>
                        <Text variant="heading">{session.name}</Text>
                        <Text variant="caption" dim>
                          {sessionSummary(session, store.settings.unit)}
                        </Text>
                      </View>
                      <Text variant="caption" dim>
                        {relativeDay(session.finishedAt!)}
                      </Text>
                      <Ionicons name="chevron-forward" size={17} color={c.textDim} />
                    </Row>
                  </Pressable>
                ))
              ) : (
                <Card style={{ gap: 8, borderStyle: 'dashed', padding: 22 }}>
                  <Text variant="heading">Tu primera sesión va aquí.</Text>
                  <Text dim>
                    Después de entrenar verás tus series, tus marcas y el punto de partida para la
                    próxima vez.
                  </Text>
                </Card>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

function ToolRow({
  title,
  detail,
  icon,
  onPress,
}: {
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 15,
        opacity: pressed ? 0.65 : 1,
        borderBottomWidth: 1,
        borderColor: c.border,
      })}
    >
      <Row>
        <Ionicons name={icon} size={23} color={c.accent} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text variant="heading">{title}</Text>
          <Text variant="caption" dim>
            {detail}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textDim} />
      </Row>
    </Pressable>
  );
}
