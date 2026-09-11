import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Card, EmptyState, Row, Screen, StatTile, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import {
  formatDuration,
  num,
  sessionDistanceKm,
  sessionDurationSec,
  sessionSetCount,
  sessionVolume,
  toDisplayWeight,
} from '@/lib/format';
import { useStore } from '@/lib/store';
import { sessionHighlights } from '@/lib/workout';

export default function WorkoutSummary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const c = useTheme();
  const session = store.sessionById(String(id));
  if (!store.ready) return <Screen />;
  if (!session?.finishedAt)
    return (
      <Screen>
        <EmptyState
          title="Este resumen no está disponible"
          action="Volver a Hoy"
          onAction={() => router.replace('/')}
        />
      </Screen>
    );
  const highlights = sessionHighlights(session, store.sessions);
  const weekly = store.sessions.filter(
    (s) =>
      s.finishedAt &&
      Date.parse(s.finishedAt) <= Date.parse(session.finishedAt!) &&
      Date.parse(s.finishedAt) >= Date.parse(session.finishedAt!) - 7 * 86400000,
  ).length;
  const volume = sessionVolume(session);
  const distance = sessionDistanceKm(session);
  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Resumen', headerBackVisible: false }} />
      <ScrollView contentContainerStyle={{ padding: 24, gap: 24, paddingBottom: 48 }}>
        <View style={{ gap: 16, paddingVertical: 16 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 22,
              backgroundColor: c.accentSoft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark-done" size={32} color={c.accent} />
          </View>
          <Text variant="display" style={{ fontSize: 38 }}>
            {'Buen trabajo.\nEntreno guardado.'}
          </Text>
          <Text dim style={{ fontSize: 18 }}>
            {session.name}
          </Text>
        </View>
        <Card style={{ gap: 20 }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <StatTile label="Series completadas" value={String(sessionSetCount(session))} accent />
            <StatTile label="Tiempo" value={formatDuration(sessionDurationSec(session))} />
          </Row>
          <Row style={{ alignItems: 'flex-start' }}>
            <StatTile label="Ejercicios" value={String(session.entries.length)} />
            {volume > 0 ? (
              <StatTile
                label={`Volumen (${store.settings.unit})`}
                value={num(toDisplayWeight(volume, store.settings.unit), 0)}
              />
            ) : distance > 0 ? (
              <StatTile label="Distancia (km)" value={num(distance, 2)} />
            ) : (
              <StatTile
                label="Repeticiones"
                value={String(
                  session.entries.reduce(
                    (sum, entry) =>
                      sum + entry.sets.reduce((total, set) => total + (set.reps ?? 0), 0),
                    0,
                  ),
                )}
              />
            )}
          </Row>
        </Card>
        <View style={{ gap: 12 }}>
          <Text variant="heading">Lo que te llevas hoy</Text>
          {highlights.length ? (
            highlights.map((text) => (
              <Row key={text} style={{ alignItems: 'flex-start' }}>
                <Ionicons name="trophy-outline" size={20} color={c.accent} />
                <Text style={{ flex: 1, lineHeight: 22 }}>{text}</Text>
              </Row>
            ))
          ) : (
            <Text dim style={{ lineHeight: 23 }}>
              Ya tienes una referencia para la próxima vez. Tus valores estarán preparados al volver
              a esta rutina.
            </Text>
          )}
          <Text dim style={{ lineHeight: 23 }}>
            {weekly === 1
              ? 'Una sesión en los últimos siete días. Has empezado.'
              : `${weekly} sesiones en los últimos siete días. Estás construyendo el hábito.`}
          </Text>
        </View>
        <Button
          title="Ver mi progreso"
          icon="trending-up"
          onPress={() => router.replace('/progress')}
        />
        <Button title="Volver a Hoy" variant="secondary" onPress={() => router.replace('/')} />
      </ScrollView>
    </Screen>
  );
}
