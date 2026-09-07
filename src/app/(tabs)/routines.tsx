import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button, Card, EmptyState, IconButton, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { exercisesLabel, plural, setsLabel } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Routine } from '@/lib/types';

export default function RoutinesScreen() {
  const c = useTheme();
  const { routines, exerciseById, deleteRoutine, duplicateRoutine, startSession, activeSession } =
    useStore();

  const confirmDelete = (r: Routine) => {
    Alert.alert('Borrar rutina', `¿Seguro que quieres borrar «${r.name}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => deleteRoutine(r.id) },
    ]);
  };

  const start = (r: Routine) => {
    const go = () => {
      const session = startSession({ routineId: r.id });
      router.push(`/session/${session.id}`);
    };
    if (activeSession) {
      Alert.alert(
        'Ya hay un entreno abierto',
        `Tienes «${activeSession.name}» sin terminar. Ábrelo o ciérralo antes de empezar otro.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Abrir el actual', onPress: () => router.push(`/session/${activeSession.id}`) },
        ],
      );
      return;
    }
    go();
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.seven }}
        showsVerticalScrollIndicator={false}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="display">Rutinas</Text>
          <IconButton name="add-circle" size={30} color={c.accent} onPress={() => router.push('/routine/new')} />
        </Row>

        <Button
          title="Catálogo de ejercicios"
          icon="library-outline"
          variant="secondary"
          onPress={() => router.push('/exercises')}
        />

        {routines.length === 0 ? (
          <Card>
            <EmptyState
              icon="clipboard-outline"
              title="Sin rutinas todavía"
              hint="Una rutina es tu plan: los ejercicios, cuántas series y con qué peso o distancia quieres hacerlos."
              action="Crear mi primera rutina"
              onAction={() => router.push('/routine/new')}
            />
          </Card>
        ) : (
          <>
            <SectionHeader title={plural(routines.length, 'rutina', 'rutinas')} />
            {routines.map((r) => {
              const names = r.items
                .map((i) => exerciseById(i.exerciseId)?.name)
                .filter(Boolean)
                .slice(0, 4)
                .join(' · ');
              return (
                <Card key={r.id} style={{ gap: Spacing.three }}>
                  <Pressable onPress={() => router.push(`/routine/${r.id}`)}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="heading">{r.name}</Text>
                        <Text variant="caption" dim style={{ marginTop: Spacing.half }}>
                          {exercisesLabel(r.items.length)} ·{' '}
                          {setsLabel(r.items.reduce((acc, i) => acc + (i.sets || 0), 0))}
                        </Text>
                      </View>
                      <IconButton name="chevron-forward" size={20} />
                    </Row>
                    {names ? (
                      <Text variant="body" dim numberOfLines={2} style={{ marginTop: Spacing.two }}>
                        {names}
                        {r.items.length > 4 ? ' …' : ''}
                      </Text>
                    ) : null}
                  </Pressable>

                  <Row gap={Spacing.two}>
                    <Button title="Empezar" icon="play" small style={{ flex: 1 }} onPress={() => start(r)} />
                    <Button
                      title="Duplicar"
                      variant="secondary"
                      small
                      onPress={() => duplicateRoutine(r.id)}
                    />
                    <Button title="Borrar" variant="danger" small onPress={() => confirmDelete(r)} />
                  </Row>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
