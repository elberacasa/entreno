import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExercisePicker } from '@/components/exercise-picker';
import { RestTimerBar, useRestTimer } from '@/components/rest-timer';
import { Button, Card, EmptyState, IconButton, Row, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import {
  describeSet,
  formatDuration,
  fromDisplayWeight,
  num,
  parseDuration,
  parseNum,
  relativeDay,
  setsLabel,
  sessionDistanceKm,
  sessionSetCount,
  sessionVolume,
  toDisplayWeight,
} from '@/lib/format';
import { makeEntry, makeSet, useStore } from '@/lib/store';
import type { SessionEntry, SetLog } from '@/lib/types';

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const store = useStore();
  const timer = useRestTimer();
  const [picking, setPicking] = useState(false);

  const session = store.sessionById(String(id));
  const readOnly = Boolean(session?.finishedAt);
  const now = useNow(!readOnly);

  const elapsed = useMemo(() => {
    if (!session) return 0;
    const end = session.finishedAt ? new Date(session.finishedAt).getTime() : now;
    return (end - new Date(session.startedAt).getTime()) / 1000;
  }, [session, now]);

  if (!session) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Este entreno ya no existe" />
      </Screen>
    );
  }

  const patchEntries = (fn: (entries: SessionEntry[]) => SessionEntry[]) => {
    store.updateSession(session.id, { entries: fn(session.entries) });
  };

  const patchSet = (entryId: string, setId: string, patch: Partial<SetLog>) => {
    patchEntries((entries) =>
      entries.map((e) =>
        e.id === entryId
          ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)) }
          : e,
      ),
    );
  };

  const toggleDone = (entry: SessionEntry, set: SetLog) => {
    const next = !set.done;
    patchSet(entry.id, set.id, { done: next });
    if (next && entry.restSec) timer.start(entry.restSec);
  };

  const addSet = (entry: SessionEntry) => {
    const last = entry.sets[entry.sets.length - 1];
    patchEntries((entries) =>
      entries.map((e) =>
        e.id === entry.id
          ? {
              ...e,
              // La nueva serie hereda los valores de la anterior: normalmente
              // repites peso y reps, y así solo tocas lo que cambia.
              sets: [
                ...e.sets,
                {
                  ...makeSet(),
                  reps: last?.reps ?? null,
                  weightKg: last?.weightKg ?? null,
                  distanceKm: last?.distanceKm ?? null,
                  durationSec: last?.durationSec ?? null,
                },
              ],
            }
          : e,
      ),
    );
  };

  const removeSet = (entryId: string, setId: string) => {
    patchEntries((entries) =>
      entries.map((e) => (e.id === entryId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e)),
    );
  };

  const removeEntry = (entry: SessionEntry) => {
    Alert.alert('Quitar ejercicio', `¿Quitar «${entry.name}» de este entreno?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () => patchEntries((entries) => entries.filter((e) => e.id !== entry.id)),
      },
    ]);
  };

  const moveEntry = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= session.entries.length) return;
    patchEntries((entries) => {
      const next = [...entries];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const finish = () => {
    const done = sessionSetCount(session);
    if (done === 0) {
      Alert.alert(
        'No has marcado ninguna serie',
        'Marca al menos una serie como hecha, o descarta el entreno.',
      );
      return;
    }
    Alert.alert('Terminar entreno', `Se guardarán ${setsLabel(done)}. Las que no marcaste se descartan.`, [
      { text: 'Seguir entrenando', style: 'cancel' },
      {
        text: 'Terminar',
        onPress: () => {
          store.finishSession(session.id);
          timer.stop();
          router.back();
        },
      },
    ]);
  };

  const discard = () => {
    Alert.alert('Descartar entreno', 'Se borrará todo lo registrado en esta sesión.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          store.deleteSession(session.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen
        options={{
          title: readOnly ? 'Entreno' : 'En curso',
          headerRight: () =>
            readOnly ? null : (
              <Pressable onPress={finish} hitSlop={8}>
                <Text variant="label" accent>
                  Terminar
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
          <Card style={{ gap: Spacing.two }}>
            {readOnly ? (
              <Text variant="title">{session.name}</Text>
            ) : (
              <TextInput
                value={session.name}
                onChangeText={(name) => store.updateSession(session.id, { name })}
                placeholder="Nombre del entreno"
                placeholderTextColor={c.textDim}
                style={{ color: c.text, fontSize: 24, fontWeight: '700' }}
              />
            )}
            <Row gap={Spacing.four}>
              <Text variant="caption" dim>
                <Ionicons name="time-outline" size={12} /> {formatDuration(elapsed)}
              </Text>
              <Text variant="caption" dim>
                {setsLabel(sessionSetCount(session))}
              </Text>
              {sessionVolume(session) > 0 ? (
                <Text variant="caption" dim>
                  {num(toDisplayWeight(sessionVolume(session), store.settings.unit), 0)}{' '}
                  {store.settings.unit}
                </Text>
              ) : null}
              {sessionDistanceKm(session) > 0 ? (
                <Text variant="caption" dim>
                  {num(sessionDistanceKm(session), 2)} km
                </Text>
              ) : null}
            </Row>
          </Card>

          {session.entries.length === 0 ? (
            <Card>
              <EmptyState
                icon="add-circle-outline"
                title="Entreno vacío"
                hint="Añade el primer ejercicio y empieza a registrar series."
                action={readOnly ? undefined : 'Añadir ejercicio'}
                onAction={() => setPicking(true)}
              />
            </Card>
          ) : (
            session.entries.map((entry, index) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                index={index}
                readOnly={readOnly}
                sessionId={session.id}
                onToggle={(set) => toggleDone(entry, set)}
                onChange={(setId, patch) => patchSet(entry.id, setId, patch)}
                onAddSet={() => addSet(entry)}
                onRemoveSet={(setId) => removeSet(entry.id, setId)}
                onRemove={() => removeEntry(entry)}
                onMoveUp={() => moveEntry(index, -1)}
                onMoveDown={() => moveEntry(index, 1)}
                onRest={(sec) =>
                  patchEntries((entries) =>
                    entries.map((e) => (e.id === entry.id ? { ...e, restSec: sec } : e)),
                  )
                }
              />
            ))
          )}

          {readOnly ? null : (
            <>
              <Button title="Añadir ejercicio" icon="add" variant="secondary" onPress={() => setPicking(true)} />
              <Button title="Descartar entreno" variant="danger" onPress={discard} />
            </>
          )}
        </ScrollView>

        {readOnly ? null : (
          <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.bg }}>
            <View style={{ paddingHorizontal: Spacing.four, paddingBottom: Spacing.two, gap: Spacing.two }}>
              <RestTimerBar timer={timer} />
              <Button title="Terminar entreno" icon="checkmark-done" onPress={finish} />
            </View>
          </SafeAreaView>
        )}
      </KeyboardAvoidingView>

      <ExercisePicker
        visible={picking}
        onClose={() => setPicking(false)}
        onPick={(picked) =>
          patchEntries((entries) => [
            ...entries,
            ...picked.map((e) => makeEntry(e, store.settings.defaultRestSec)),
          ])
        }
      />
    </Screen>
  );
}

function EntryCard({
  entry,
  index,
  readOnly,
  sessionId,
  onToggle,
  onChange,
  onAddSet,
  onRemoveSet,
  onRemove,
  onMoveUp,
  onMoveDown,
  onRest,
}: {
  entry: SessionEntry;
  index: number;
  readOnly: boolean;
  sessionId: string;
  onToggle: (set: SetLog) => void;
  onChange: (setId: string, patch: Partial<SetLog>) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRest: (sec: number) => void;
}) {
  const c = useTheme();
  const { lastEntryFor, settings } = useStore();
  const previous = lastEntryFor(entry.exerciseId, sessionId);

  const headers =
    entry.kind === 'strength'
      ? [settings.unit, 'reps', 'rpe']
      : entry.kind === 'cardio'
        ? ['km', 'tiempo']
        : ['tiempo'];

  const cycleRest = () => {
    const options = [0, 60, 90, 120, 180, 240];
    const current = entry.restSec ?? 0;
    const next = options[(options.indexOf(current) + 1) % options.length] ?? 0;
    onRest(next);
  };

  return (
    <Card style={{ gap: Spacing.three, padding: Spacing.three }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{entry.name}</Text>
          {previous ? (
            <Text variant="caption" dim numberOfLines={1}>
              Última vez ({relativeDay(previous.session.finishedAt!)}):{' '}
              {previous.entry.sets
                .filter((s) => s.done)
                .slice(0, 3)
                .map((s) => describeSet(s, previous.entry.kind, settings.unit))
                .join(' · ')}
            </Text>
          ) : (
            <Text variant="caption" dim>
              Primera vez que lo registras
            </Text>
          )}
        </View>
        {readOnly ? null : (
          <Row gap={Spacing.three}>
            <IconButton name="chevron-up" size={18} onPress={onMoveUp} />
            <IconButton name="chevron-down" size={18} onPress={onMoveDown} />
            <IconButton name="trash-outline" size={18} onPress={onRemove} />
          </Row>
        )}
      </Row>

      <Row gap={Spacing.two} style={{ paddingHorizontal: Spacing.one }}>
        <Text variant="caption" dim style={{ width: 24 }}>
          #
        </Text>
        {headers.map((h) => (
          <Text key={h} variant="caption" dim style={{ flex: h === 'rpe' ? 0.7 : 1 }}>
            {h.toUpperCase()}
          </Text>
        ))}
        <View style={{ width: 30 }} />
      </Row>

      {entry.sets.map((set, i) => (
        <SetRow
          key={set.id}
          set={set}
          index={i + 1}
          kind={entry.kind}
          unit={settings.unit}
          readOnly={readOnly}
          onToggle={() => onToggle(set)}
          onChange={(patch) => onChange(set.id, patch)}
          onRemove={() => onRemoveSet(set.id)}
        />
      ))}

      {readOnly ? null : (
        <Row gap={Spacing.two}>
          <Button title="Añadir serie" icon="add" variant="secondary" small style={{ flex: 1 }} onPress={onAddSet} />
          <Pressable
            onPress={cycleRest}
            style={{
              paddingHorizontal: Spacing.three,
              paddingVertical: Spacing.two + 2,
              borderRadius: Radius.md,
              backgroundColor: c.surface2,
            }}>
            <Text variant="label" dim>
              Descanso {entry.restSec ? formatDuration(entry.restSec) : 'off'}
            </Text>
          </Pressable>
        </Row>
      )}
    </Card>
  );
}

function SetRow({
  set,
  index,
  kind,
  unit,
  readOnly,
  onToggle,
  onChange,
  onRemove,
}: {
  set: SetLog;
  index: number;
  kind: SessionEntry['kind'];
  unit: 'kg' | 'lb';
  readOnly: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<SetLog>) => void;
  onRemove: () => void;
}) {
  const c = useTheme();

  // El texto vive en local para no pelearse con el formateo mientras escribes.
  const [weight, setWeight] = useState(
    set.weightKg != null ? num(toDisplayWeight(set.weightKg, unit)) : '',
  );
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : '');
  const [rpe, setRpe] = useState(set.rpe != null ? String(set.rpe) : '');
  const [km, setKm] = useState(set.distanceKm != null ? num(set.distanceKm) : '');
  const [time, setTime] = useState(set.durationSec != null ? formatDuration(set.durationSec) : '');

  if (readOnly) {
    return (
      <Row gap={Spacing.two} style={{ paddingHorizontal: Spacing.one }}>
        <Text variant="caption" dim style={{ width: 24 }}>
          {index}
        </Text>
        <Text variant="mono" style={{ flex: 1 }}>
          {describeSet(set, kind, unit)}
        </Text>
        {set.rpe ? (
          <Text variant="caption" dim>
            RPE {set.rpe}
          </Text>
        ) : null}
      </Row>
    );
  }

  const cell = (
    value: string,
    setValue: (v: string) => void,
    commit: (v: string) => void,
    placeholder: string,
    flex = 1,
    keyboard: 'decimal-pad' | 'numbers-and-punctuation' = 'decimal-pad',
  ) => (
    <TextInput
      value={value}
      onChangeText={(v) => {
        setValue(v);
        commit(v);
      }}
      placeholder={placeholder}
      placeholderTextColor={c.textDim}
      keyboardType={keyboard}
      style={{
        flex,
        // Sin `minWidth: 0` el input no encoge y la fila se sale de la tarjeta.
        minWidth: 0,
        backgroundColor: set.done ? 'transparent' : c.surface2,
        borderRadius: Radius.sm,
        paddingVertical: Spacing.two,
        textAlign: 'center',
        color: c.text,
        fontSize: 16,
        fontWeight: '700',
      }}
    />
  );

  return (
    <Row gap={Spacing.two} style={{ paddingHorizontal: Spacing.one }}>
      <Pressable onLongPress={onRemove} hitSlop={6} style={{ width: 24 }}>
        <Text variant="caption" dim>
          {index}
        </Text>
      </Pressable>

      {kind === 'strength' ? (
        <>
          {cell(weight, setWeight, (v) => {
            const parsed = parseNum(v);
            onChange({ weightKg: parsed == null ? null : fromDisplayWeight(parsed, unit) });
          }, '0')}
          {cell(reps, setReps, (v) => onChange({ reps: parseNum(v) }), '0')}
          {cell(rpe, setRpe, (v) => onChange({ rpe: parseNum(v) }), '–', 0.7)}
        </>
      ) : kind === 'cardio' ? (
        <>
          {cell(km, setKm, (v) => onChange({ distanceKm: parseNum(v) }), '0.0')}
          {cell(time, setTime, (v) => onChange({ durationSec: parseDuration(v) }), 'mm:ss', 1, 'numbers-and-punctuation')}
        </>
      ) : (
        cell(time, setTime, (v) => onChange({ durationSec: parseDuration(v) }), 'mm:ss', 1, 'numbers-and-punctuation')
      )}

      <Pressable
        onPress={onToggle}
        hitSlop={6}
        style={{
          width: 30,
          height: 30,
          borderRadius: Radius.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: set.done ? c.accent : c.surface2,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: set.done ? c.accent : c.border,
        }}>
        <Ionicons name="checkmark" size={18} color={set.done ? c.onAccent : c.textDim} />
      </Pressable>
    </Row>
  );
}
