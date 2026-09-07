import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useDialog } from '@/components/dialog';
import { Button, Chip, Field, IconButton, Row, Screen, Sheet, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { exercisesLabel } from '@/lib/format';
import { EXERCISE_GROUPS } from '@/lib/seed';
import { useStore } from '@/lib/store';
import { describeExercise, KIND_LABEL, type ExerciseKind } from '@/lib/types';

export default function ExercisesScreen() {
  const c = useTheme();
  const { confirm } = useDialog();
  const { exercises, sessions, routines, addExercise, deleteExercise } = useStore();

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [newGroup, setNewGroup] = useState('Pecho');
  const [kind, setKind] = useState<ExerciseKind>('strength');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => (group ? e.group === group : true))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [exercises, group, query]);

  const usageCount = (exerciseId: string) =>
    sessions.filter((s) => s.entries.some((e) => e.exerciseId === exerciseId)).length +
    routines.filter((r) => r.items.some((i) => i.exerciseId === exerciseId)).length;

  const confirmDelete = async (id: string, label: string) => {
    const uses = usageCount(id);
    const ok = await confirm({
      title: `Borrar «${label}»`,
      message:
        uses > 0
          ? `Aparece en ${uses} rutinas o entrenos. Se borra del catálogo, pero lo ya registrado se conserva.`
          : 'Se borra del catálogo de ejercicios.',
      confirmText: 'Borrar',
      destructive: true,
    });
    if (ok) deleteExercise(id);
  };

  const create = () => {
    const clean = name.trim();
    if (!clean) return;
    addExercise({ name: clean, group: newGroup, kind });
    setName('');
    setCreating(false);
  };

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.seven }}
        keyboardShouldPersistTaps="handled">
        <Field
          placeholder="Buscar…"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          full
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
          <Chip label="Todos" selected={group === null} onPress={() => setGroup(null)} />
          {EXERCISE_GROUPS.map((g) => (
            <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(group === g ? null : g)} />
          ))}
        </ScrollView>

        <Button title="Nuevo ejercicio" icon="add" onPress={() => setCreating(true)} />

        <Text variant="caption" dim>
          {exercisesLabel(filtered.length)}
        </Text>

        <View
          style={{
            borderRadius: Radius.lg,
            overflow: 'hidden',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: c.border,
          }}>
          {filtered.map((e, i) => (
            <Row
              key={e.id}
              style={{
                justifyContent: 'space-between',
                paddingHorizontal: Spacing.four,
                paddingVertical: Spacing.three,
                backgroundColor: c.surface,
                borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                borderTopColor: c.border,
              }}>
              <View style={{ flex: 1 }}>
                <Text variant="body">{e.name}</Text>
                <Text variant="caption" dim>
                  {describeExercise(e)}
                  {e.custom ? ' · propio' : ''}
                </Text>
              </View>
              <IconButton name="trash-outline" size={18} onPress={() => confirmDelete(e.id, e.name)} />
            </Row>
          ))}
        </View>
      </ScrollView>

      <Sheet
        visible={creating}
        onClose={() => setCreating(false)}
        title="Nuevo ejercicio"
        footer={<Button title="Crear" icon="checkmark" onPress={create} disabled={!name.trim()} />}>
        <Field
          label="Nombre"
          placeholder="Ej. Remo Pendlay"
          value={name}
          onChangeText={setName}
          autoFocus
          full
        />

        <Text variant="overline" faint>
          Tipo de registro
        </Text>
        <Row gap={Spacing.two}>
          {(['strength', 'cardio', 'time'] as const).map((k) => (
            <Chip key={k} label={KIND_LABEL[k]} selected={kind === k} onPress={() => setKind(k)} />
          ))}
        </Row>
        <Text variant="caption" dim>
          {kind === 'strength'
            ? 'Registrarás peso, repeticiones y RPE por serie.'
            : kind === 'cardio'
              ? 'Registrarás distancia y tiempo (y calculo el ritmo).'
              : 'Registrarás solo la duración de cada serie.'}
        </Text>

        <Text variant="overline" faint style={{ marginTop: Spacing.two }}>
          Grupo
        </Text>
        <Row style={{ flexWrap: 'wrap', gap: Spacing.two }}>
          {EXERCISE_GROUPS.map((g) => (
            <Chip key={g} label={g} selected={newGroup === g} onPress={() => setNewGroup(g)} />
          ))}
        </Row>
      </Sheet>
    </Screen>
  );
}
