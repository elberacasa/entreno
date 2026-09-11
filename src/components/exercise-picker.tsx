import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Field, Row, Sheet, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { EXERCISE_GROUPS } from '@/lib/seed';
import { useStore } from '@/lib/store';
import { describeExercise, KIND_LABEL, type Exercise, type ExerciseKind } from '@/lib/types';

/**
 * Hoja para elegir uno o varios ejercicios del catálogo. Permite crear uno
 * nuevo sin salir de la hoja cuando la búsqueda no encuentra nada.
 */
export function ExercisePicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (exercises: Exercise[]) => void;
}) {
  const c = useTheme();
  const { exercises, addExercise } = useStore();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const groups = useMemo(() => {
    const present = new Set(exercises.map((e) => e.group));
    return EXERCISE_GROUPS.filter((g) => present.has(g));
  }, [exercises]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return exercises
      .filter((e) => (group ? e.group === group : true))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [exercises, group, query]);

  const reset = () => {
    setQuery('');
    setGroup(null);
    setSelected([]);
  };

  const close = () => {
    reset();
    onClose();
  };

  const confirm = () => {
    const picked = selected
      .map((id) => exercises.find((e) => e.id === id))
      .filter((e): e is Exercise => Boolean(e));
    if (picked.length > 0) onPick(picked);
    close();
  };

  const createFromQuery = (kind: ExerciseKind) => {
    const name = query.trim();
    if (!name) return;
    const created = addExercise({ name, kind, group: group ?? 'Otro' });
    onPick([created]);
    close();
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Elegir ejercicio"
      footer={
        <Button
          title={selected.length > 0 ? `Añadir ${selected.length}` : 'Añadir'}
          icon="add"
          disabled={selected.length === 0}
          onPress={confirm}
        />
      }>
      <Field
        placeholder="Buscar ejercicio…"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        full
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        <Chip label="Todos" selected={group === null} onPress={() => setGroup(null)} />
        {groups.map((g) => (
          <Chip key={g} label={g} selected={group === g} onPress={() => setGroup(group === g ? null : g)} />
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <Card style={{ gap: Spacing.three }}>
          <Text variant="heading">Crear «{query.trim() || 'nuevo ejercicio'}»</Text>
          <Text variant="body" dim>
            No hay nada con ese nombre. Elige de qué tipo es y lo añado al catálogo.
          </Text>
          <Row style={{ flexWrap: 'wrap', gap: Spacing.two }}>
            {(['strength', 'cardio', 'time'] as const).map((k) => (
              <Chip key={k} label={KIND_LABEL[k]} onPress={() => createFromQuery(k)} />
            ))}
          </Row>
        </Card>
      ) : (
        <View style={{ borderRadius: Radius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }}>
          {filtered.map((e, i) => {
            const isSelected = selected.includes(e.id);
            return (
              <Pressable
                key={e.id}
                onPress={() =>
                  setSelected((prev) =>
                    prev.includes(e.id) ? prev.filter((id) => id !== e.id) : [...prev, e.id],
                  )
                }
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.three,
                  paddingHorizontal: Spacing.four,
                  paddingVertical: Spacing.three,
                  backgroundColor: pressed ? c.surface2 : c.surface,
                  borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                  borderTopColor: c.border,
                })}>
                <Ionicons
                  name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={isSelected ? c.accent : c.border}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="body">{e.name}</Text>
                  <Text variant="caption" dim>
                    {describeExercise(e)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}
