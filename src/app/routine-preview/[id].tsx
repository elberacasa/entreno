import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { DemoThumb, ExerciseDemoSheet } from '@/components/exercise-demo';
import { Button, IconButton, Row, Screen, Text } from '@/components/ui';
import { useStore } from '@/lib/store';
import { primaryGroups } from '@/lib/weekly-plan';
import { estimateMinutes } from '@/lib/recommend';
import type { Exercise } from '@/lib/types';

export default function RoutinePreview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const [demo, setDemo] = useState<Exercise | null>(null);
  const routine = store.routineById(id);
  if (!store.ready) return <Screen />;
  if (!routine)
    return (
      <Screen>
        <Text>Esta rutina ya no existe.</Text>
        <Button title="Volver a mi plan" onPress={() => router.replace('/routines')} />
      </Screen>
    );
  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{
          title: 'Tu sesión',
          headerLeft: () => (
            <IconButton
              name="arrow-back"
              accessibilityLabel="Volver"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            />
          ),
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 44 }}>
        <Text variant="display">{routine.name}</Text>
        <Text dim>{primaryGroups(routine.items, store.exercises).join(' · ')}</Text>
        <Text>
          {routine.items.length} ejercicios · aprox.{' '}
          {estimateMinutes(
            routine.items.map((i) => ({
              ...i,
              restSec: i.restSec ?? store.settings.defaultRestSec,
            })),
          )}{' '}
          min
        </Text>
        <Button
          title={store.activeSession ? 'Continuar sesión en curso' : 'Empezar esta sesión'}
          icon="play"
          onPress={() => {
            const session = store.activeSession ?? store.startSession({ routineId: routine.id });
            router.push(`/session/${session.id}`);
          }}
        />
        <Text variant="caption" dim>
          Toca un ejercicio para ver su técnica. Ajusta la carga durante la sesión.
        </Text>
        {routine.items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Ver técnica de ${store.exerciseById(item.exerciseId)?.name ?? 'ejercicio'}`}
            onPress={() => setDemo(store.exerciseById(item.exerciseId) ?? null)}
          >
            <Row gap={14}>
              <DemoThumb exerciseId={item.exerciseId} size={64} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="heading">
                  {store.exerciseById(item.exerciseId)?.name ?? 'Ejercicio no disponible'}
                </Text>
                <Text variant="caption" dim>
                  {item.sets} series de {item.reps ?? `${item.durationSec ?? 30} s`}
                  {item.reps ? ' repeticiones' : ''}
                </Text>
                <Text variant="caption" dim>
                  Descanso: {item.restSec ?? store.settings.defaultRestSec} s
                </Text>
              </View>
            </Row>
          </Pressable>
        ))}
        <Button
          title="Editar ejercicios y series"
          variant="secondary"
          onPress={() => router.push(`/routine/${routine.id}`)}
        />
      </ScrollView>
      <ExerciseDemoSheet exercise={demo} onClose={() => setDemo(null)} />
    </Screen>
  );
}
