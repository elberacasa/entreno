import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { useDialog } from '@/components/dialog';
import { ExercisePicker } from '@/components/exercise-picker';
import { Button, Card, EmptyState, Field, IconButton, Row, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  exercisesLabel,
  formatDuration,
  fromDisplayWeight,
  num,
  parseDuration,
  parseNum,
  setsLabel,
  toDisplayWeight,
} from '@/lib/format';
import { uid } from '@/lib/id';
import { useStore } from '@/lib/store';
import type { PlanItem, Routine } from '@/lib/types';

export default function RoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();

  // El editor arranca copiando la rutina a un borrador. Si se monta antes de
  // que el almacén termine de cargar (al recargar la app en esta pantalla) la
  // copiaría vacía y «Guardar» borraría la rutina de verdad.
  if (!store.ready) return <Screen />;

  return <RoutineEditor id={String(id)} />;
}

function RoutineEditor({ id }: { id: string }) {
  const store = useStore();
  const { confirm, notify } = useDialog();
  const isNew = id === 'new';
  const existing = isNew ? undefined : store.routineById(id);

  const [draft, setDraft] = useState<Routine>(() => {
    if (existing) return { ...existing, items: existing.items.map((i) => ({ ...i })) };
    const now = new Date().toISOString();
    return { id: uid('rt-'), name: '', notes: '', items: [], createdAt: now, updatedAt: now };
  });
  const [picking, setPicking] = useState(false);

  const totalSets = useMemo(() => draft.items.reduce((a, i) => a + (i.sets || 0), 0), [draft.items]);

  if (!isNew && !existing) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Esta rutina ya no existe" />
      </Screen>
    );
  }

  const patchItem = (itemId: string, patch: Partial<PlanItem>) =>
    setDraft((d) => ({
      ...d,
      items: d.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
    }));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= draft.items.length) return;
    setDraft((d) => {
      const items = [...d.items];
      [items[index], items[target]] = [items[target], items[index]];
      return { ...d, items };
    });
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) {
      await notify({
        title: 'Falta el nombre',
        message: 'Ponle un nombre a la rutina para poder guardarla.',
      });
      return;
    }
    if (draft.items.length === 0) {
      await notify({ title: 'Rutina vacía', message: 'Añade al menos un ejercicio.' });
      return;
    }
    store.upsertRoutine({ ...draft, name });
    router.back();
  };

  const remove = async () => {
    const ok = await confirm({
      title: `Borrar «${draft.name || 'sin nombre'}»`,
      message: 'La rutina desaparece. Los entrenos que ya hiciste con ella se conservan.',
      confirmText: 'Borrar rutina',
      destructive: true,
    });
    if (!ok) return;
    store.deleteRoutine(draft.id);
    router.back();
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{
          title: isNew ? 'Nueva rutina' : 'Editar rutina',
          headerRight: () => (
            // El padding aparta el texto del borde: sin él la cabecera lo corta.
            <Pressable onPress={save} hitSlop={8} style={{ paddingHorizontal: Spacing.three }}>
              <Text variant="label" accent>
                Guardar
              </Text>
            </Pressable>
          ),
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.seven }}>
          <Card style={{ gap: Spacing.three }}>
            <Field
              label="Nombre"
              placeholder="Ej. Torso A, Pierna pesada, Fondo largo"
              value={draft.name}
              onChangeText={(name) => setDraft((d) => ({ ...d, name }))}
              full
            />
            <Field
              label="Notas"
              placeholder="Opcional: objetivo de la sesión, avisos…"
              value={draft.notes ?? ''}
              onChangeText={(notes) => setDraft((d) => ({ ...d, notes }))}
              multiline
              full
            />
            <Text variant="caption" dim>
              {exercisesLabel(draft.items.length)} · {setsLabel(totalSets)} planificadas
            </Text>
          </Card>

          {draft.items.length === 0 ? (
            <Card>
              <EmptyState
                icon="barbell-outline"
                title="Sin ejercicios"
                hint="Añade ejercicios y define cuántas series quieres hacer y con qué objetivo."
                action="Añadir ejercicio"
                onAction={() => setPicking(true)}
              />
            </Card>
          ) : (
            draft.items.map((item, index) => {
              const exercise = store.exerciseById(item.exerciseId);
              const kind = exercise?.kind ?? 'strength';
              return (
                <Card key={item.id} style={{ gap: Spacing.three, padding: Spacing.three }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="heading">{exercise?.name ?? 'Ejercicio borrado'}</Text>
                      <Text variant="caption" dim>
                        {exercise?.group ?? '—'}
                      </Text>
                    </View>
                    <Row gap={Spacing.three}>
                      <IconButton name="chevron-up" size={18} onPress={() => move(index, -1)} />
                      <IconButton name="chevron-down" size={18} onPress={() => move(index, 1)} />
                      <IconButton
                        name="trash-outline"
                        size={18}
                        onPress={() =>
                          setDraft((d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id) }))
                        }
                      />
                    </Row>
                  </Row>

                  <Row gap={Spacing.two} style={{ alignItems: 'flex-end' }}>
                    <Field
                      label="Series"
                      keyboardType="number-pad"
                      defaultValue={String(item.sets)}
                      onChangeText={(v) => patchItem(item.id, { sets: parseNum(v) ?? 0 })}
                    />
                    {kind === 'strength' ? (
                      <>
                        <Field
                          label="Reps"
                          placeholder="—"
                          keyboardType="number-pad"
                          defaultValue={item.reps != null ? String(item.reps) : ''}
                          onChangeText={(v) => patchItem(item.id, { reps: parseNum(v) })}
                        />
                        <Field
                          label={`Peso (${store.settings.unit})`}
                          placeholder="—"
                          keyboardType="decimal-pad"
                          defaultValue={
                            item.weightKg != null
                              ? num(toDisplayWeight(item.weightKg, store.settings.unit))
                              : ''
                          }
                          onChangeText={(v) => {
                            const parsed = parseNum(v);
                            patchItem(item.id, {
                              weightKg:
                                parsed == null ? null : fromDisplayWeight(parsed, store.settings.unit),
                            });
                          }}
                        />
                      </>
                    ) : kind === 'cardio' ? (
                      <>
                        <Field
                          label="Km"
                          placeholder="—"
                          keyboardType="decimal-pad"
                          defaultValue={item.distanceKm != null ? num(item.distanceKm) : ''}
                          onChangeText={(v) => patchItem(item.id, { distanceKm: parseNum(v) })}
                        />
                        <Field
                          label="Tiempo"
                          placeholder="mm:ss"
                          defaultValue={item.durationSec != null ? formatDuration(item.durationSec) : ''}
                          onChangeText={(v) => patchItem(item.id, { durationSec: parseDuration(v) })}
                        />
                      </>
                    ) : (
                      <Field
                        label="Tiempo por serie"
                        placeholder="mm:ss"
                        defaultValue={item.durationSec != null ? formatDuration(item.durationSec) : ''}
                        onChangeText={(v) => patchItem(item.id, { durationSec: parseDuration(v) })}
                      />
                    )}
                  </Row>

                  <Field
                    label="Descanso (mm:ss)"
                    placeholder={formatDuration(store.settings.defaultRestSec)}
                    defaultValue={item.restSec != null ? formatDuration(item.restSec) : ''}
                    onChangeText={(v) => patchItem(item.id, { restSec: parseDuration(v) })}
                    full
                  />
                </Card>
              );
            })
          )}

          <Button title="Añadir ejercicio" icon="add" variant="secondary" onPress={() => setPicking(true)} />
          <Button title="Guardar rutina" icon="checkmark" onPress={save} />
          {isNew ? null : <Button title="Borrar rutina" variant="danger" onPress={remove} />}
        </ScrollView>
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(picked) =>
          setDraft((d) => ({
            ...d,
            items: [
              ...d.items,
              ...picked.map<PlanItem>((e) => ({
                id: uid('pi-'),
                exerciseId: e.id,
                sets: e.kind === 'strength' ? 3 : 1,
                restSec: store.settings.defaultRestSec,
              })),
            ],
          }))
        }
      />
    </Screen>
  );
}
