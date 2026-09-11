import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useDialog } from '@/components/dialog';
import { ExerciseDemoSheet, hasDemo } from '@/components/exercise-demo';
import { ExercisePicker } from '@/components/exercise-picker';
import { RestTimerBar, useRestTimer } from '@/components/rest-timer';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  ProgressBar,
  Row,
  Screen,
  StatTile,
  Text,
} from '@/components/ui';
import { Radius, Spacing, Tabular, elevation } from '@/constants/theme';
import { useKeepAwake } from '@/hooks/use-keep-awake';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import {
  describePlanned,
  describeSet,
  describeSetRun,
  formatDuration,
  fromDisplayWeight,
  num,
  parseDuration,
  parseNum,
  relativeDay,
  sessionDistanceKm,
  sessionSetCount,
  sessionVolume,
  setsLabel,
  toDisplayWeight,
} from '@/lib/format';
import { setError } from '@/lib/workout';
import { makeEntry, makeSet, useStore } from '@/lib/store';
import type { Exercise, SessionEntry, SetLog } from '@/lib/types';

/**
 * Rejilla compartida por la cabecera de columnas y las filas de series. Están
 * definidas en un solo sitio para que no se desalineen nunca.
 */
const INDEX_W = 22;
const CHECK_W = 40;
const CELL_GAP = Spacing.two;
const ROW_H = 44;

interface Column {
  key: 'weight' | 'reps' | 'rpe' | 'km' | 'time';
  label: string;
  flex: number;
}

function columnsFor(kind: SessionEntry['kind'], unit: 'kg' | 'lb'): Column[] {
  if (kind === 'strength') {
    return [
      { key: 'weight', label: unit, flex: 1 },
      { key: 'reps', label: 'reps', flex: 1 },
      { key: 'rpe', label: 'rpe', flex: 0.8 },
    ];
  }
  if (kind === 'cardio') {
    return [
      { key: 'km', label: 'km', flex: 1 },
      { key: 'time', label: 'tiempo', flex: 1 },
    ];
  }
  return [{ key: 'time', label: 'tiempo', flex: 1 }];
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const store = useStore();
  const timer = useRestTimer();
  const { confirm, notify } = useDialog();
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [demo, setDemo] = useState<Exercise | null>(null);

  const session = store.sessionById(String(id));
  const readOnly = Boolean(session?.finishedAt);
  const now = useNow(!readOnly && store.ready);

  // Solo mientras el entreno está en curso: en uno ya cerrado no hay nada que
  // mirar entre series y no tiene sentido comerse la batería.
  useKeepAwake(store.ready && !readOnly && session != null);

  const elapsed = useMemo(() => {
    if (!session) return 0;
    const end = session.finishedAt ? new Date(session.finishedAt).getTime() : now;
    return (end - new Date(session.startedAt).getTime()) / 1000;
  }, [session, now]);

  // Mientras carga el almacén no hay sesión todavía: sin esto se vería un
  // «ya no existe» durante un instante al abrir la app en esta pantalla.
  if (!store.ready) return <Screen />;

  if (!session) {
    return (
      <Screen>
        <EmptyState icon="alert-circle-outline" title="Este entreno ya no existe" />
      </Screen>
    );
  }

  const patchEntries = (fn: (entries: SessionEntry[]) => SessionEntry[]) => {
    store.updateSession(session.id, (current) => ({ entries: fn(current.entries) }));
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
    const error = setError(set, entry.kind);
    if (!set.done && error) {
      void notify({ title: 'Revisa esta serie', message: error });
      return;
    }
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

  const removeSet = async (entryId: string, setId: string) => {
    if (
      !(await confirm({
        title: 'Quitar serie',
        message: 'Se quitarán los datos de esta serie.',
        confirmText: 'Quitar',
        destructive: true,
      }))
    )
      return;
    patchEntries((entries) =>
      entries.map((e) =>
        e.id === entryId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
      ),
    );
  };

  const removeEntry = async (entry: SessionEntry) => {
    const ok = await confirm({
      title: 'Quitar ejercicio',
      message: `Se quita «${entry.name}» de este entreno con las series que lleve.`,
      confirmText: 'Quitar',
      destructive: true,
    });
    if (ok) patchEntries((entries) => entries.filter((e) => e.id !== entry.id));
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

  const finish = async () => {
    if (saving) return;
    for (const entry of session.entries) {
      for (const set of entry.sets.filter((s) => s.done)) {
        const error = setError(set, entry.kind);
        if (error) {
          await notify({ title: entry.name, message: error });
          return;
        }
      }
    }
    const done = sessionSetCount(session);
    if (done === 0) {
      await notify({
        title: 'No has marcado ninguna serie',
        message: 'Marca al menos una serie como hecha, o descarta el entreno.',
      });
      return;
    }
    const ok = await confirm({
      title: 'Terminar entreno',
      message: `Se guardarán ${setsLabel(done)}. Las que no marcaste se descartan.`,
      confirmText: 'Terminar',
      cancelText: 'Seguir entrenando',
    });
    if (!ok) return;
    setSaving(true);
    const failed = await store.finishSession(session.id);
    setSaving(false);
    if (failed) {
      await notify({
        title: 'El entreno sigue pendiente de guardar',
        message:
          'Conserva la app abierta y exporta una copia desde Ajustes. Tus datos siguen disponibles en esta pantalla.',
      });
      return;
    }
    timer.stop();
    router.replace(`/summary/${session.id}`);
  };

  const discard = async () => {
    const ok = await confirm({
      title: 'Descartar entreno',
      message: 'Se borrará todo lo registrado en esta sesión. No se puede deshacer.',
      confirmText: 'Descartar',
      destructive: true,
    });
    if (!ok) return;
    store.deleteSession(session.id);
    timer.stop();
    router.back();
  };

  const totalSets = session.entries.reduce((acc, e) => acc + e.sets.length, 0);
  const doneSets = sessionSetCount(session);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: readOnly ? 'Entreno' : 'En curso' }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: Spacing.four,
            gap: Spacing.three,
            // Deja sitio a la barra fija de abajo.
            paddingBottom: readOnly ? Spacing.seven : 140,
          }}
        >
          <Card style={{ gap: Spacing.three }}>
            {readOnly ? (
              <Text variant="title">{session.name}</Text>
            ) : (
              <TextInput
                value={session.name}
                onChangeText={(name) => store.updateSession(session.id, { name })}
                placeholder="Nombre del entreno"
                placeholderTextColor={c.textFaint}
                style={{
                  color: c.text,
                  fontSize: 22,
                  fontWeight: '800',
                  letterSpacing: -0.5,
                  padding: 0,
                }}
              />
            )}

            {/* StatTile reparte el ancho a partes iguales y encoge la cifra si
                hace falta, así la fila nunca se sale de la tarjeta. */}
            <Row style={{ alignItems: 'flex-start' }} gap={Spacing.three}>
              <StatTile label="Tiempo" value={formatDuration(elapsed)} accent={!readOnly} />
              <StatTile label="Series" value={`${doneSets}/${totalSets}`} />
              {sessionVolume(session) > 0 ? (
                <StatTile
                  label="Volumen"
                  value={num(toDisplayWeight(sessionVolume(session), store.settings.unit), 0)}
                  unit={store.settings.unit}
                />
              ) : null}
              {sessionDistanceKm(session) > 0 ? (
                <StatTile label="Distancia" value={num(sessionDistanceKm(session), 2)} unit="km" />
              ) : null}
            </Row>

            <ProgressBar value={totalSets > 0 ? doneSets / totalSets : 0} />
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
                readOnly={readOnly}
                sessionId={session.id}
                first={index === 0}
                last={index === session.entries.length - 1}
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
                onShowDemo={setDemo}
              />
            ))
          )}

          {readOnly ? null : (
            <>
              <Button
                title="Añadir ejercicio"
                icon="add"
                variant="secondary"
                onPress={() => setPicking(true)}
              />
              {/* Descartar vive al final y en tono apagado: no compite con Terminar. */}
              <Pressable
                onPress={discard}
                hitSlop={8}
                style={{ alignSelf: 'center', padding: Spacing.three }}
              >
                <Text variant="label" danger>
                  Descartar entreno
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>

        {readOnly ? null : (
          <View
            style={[
              {
                backgroundColor: c.surface,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: c.border,
              },
              elevation(3, c.shadow),
            ]}
          >
            <SafeAreaView edges={['bottom']}>
              <View
                style={{
                  paddingHorizontal: Spacing.four,
                  paddingTop: Spacing.three,
                  paddingBottom: Spacing.three,
                  gap: Spacing.two,
                }}
              >
                <RestTimerBar timer={timer} />
                <Button
                  title="Terminar entreno"
                  icon="checkmark-done"
                  loading={saving}
                  onPress={finish}
                />
              </View>
            </SafeAreaView>
          </View>
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

      <ExerciseDemoSheet exercise={demo} onClose={() => setDemo(null)} />
    </Screen>
  );
}

function EntryCard({
  entry,
  readOnly,
  sessionId,
  first,
  last,
  onToggle,
  onChange,
  onAddSet,
  onRemoveSet,
  onRemove,
  onMoveUp,
  onMoveDown,
  onRest,
  onShowDemo,
}: {
  entry: SessionEntry;
  readOnly: boolean;
  sessionId: string;
  first: boolean;
  last: boolean;
  onToggle: (set: SetLog) => void;
  onChange: (setId: string, patch: Partial<SetLog>) => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRest: (sec: number) => void;
  onShowDemo: (exercise: Exercise) => void;
}) {
  const c = useTheme();
  const { exerciseById, lastEntryFor, settings, sessionById, routineById } = useStore();
  const routineId = sessionById(sessionId)?.routineId;
  const planned = routineId
    ? routineById(routineId)?.items.find((item) => item.exerciseId === entry.exerciseId)
    : undefined;
  const previous = lastEntryFor(entry.exerciseId, sessionId);
  const exercise = exerciseById(entry.exerciseId);
  const [effort, setEffort] = useState(entry.sets.some((set) => set.rpe != null));
  const columns = columnsFor(entry.kind, settings.unit).filter(
    (column) => effort || column.key !== 'rpe',
  );

  const done = entry.sets.filter((s) => s.done).length;
  const complete = entry.sets.length > 0 && done === entry.sets.length;

  const cycleRest = () => {
    const options = [0, 60, 90, 120, 180, 240];
    const current = entry.restSec ?? 0;
    onRest(options[(options.indexOf(current) + 1) % options.length] ?? 0);
  };

  return (
    <Card
      style={{
        gap: Spacing.three,
        padding: Spacing.three,
        // El ejercicio terminado se marca con el borde, sin gritar.
        borderColor: complete ? c.accentDim : c.border,
      }}
    >
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: Spacing.half }}>
          {/* Tocar el nombre abre la demostración: entre serie y serie es el
              sitio donde uno duda de la técnica. */}
          <Pressable onPress={() => (exercise ? onShowDemo(exercise) : null)} disabled={!exercise}>
            <Row gap={Spacing.two}>
              <Text variant="heading" numberOfLines={1} style={{ flexShrink: 1 }}>
                {entry.name}
              </Text>
              {exercise && hasDemo(exercise.id) ? (
                <Ionicons name="play-circle" size={17} color={c.accent} />
              ) : null}
              <Badge
                label={`${done}/${entry.sets.length}`}
                tone={complete ? 'accent' : 'neutral'}
              />
            </Row>
          </Pressable>
          {!readOnly && planned ? (
            <Text variant="caption" dim>
              Objetivo: {describePlanned({ ...planned, kind: entry.kind })}
              {planned.weightKg
                ? ` · ${num(toDisplayWeight(planned.weightKg, settings.unit))} ${settings.unit}`
                : ''}
            </Text>
          ) : null}
          {previous ? (
            <Text variant="caption" faint numberOfLines={1}>
              {relativeDay(previous.session.finishedAt!)}:{' '}
              {describeSetRun(previous.entry.sets, previous.entry.kind, settings.unit)}
            </Text>
          ) : (
            <Text variant="caption" faint>
              Tu primera referencia empieza hoy
            </Text>
          )}
        </View>

        {readOnly ? null : (
          <Row gap={Spacing.two} style={{ flexShrink: 0 }}>
            {first ? null : <IconButton name="arrow-up" size={16} onPress={onMoveUp} />}
            {last ? null : <IconButton name="arrow-down" size={16} onPress={onMoveDown} />}
            <IconButton
              name="close"
              accessibilityLabel={`Quitar ${entry.name}`}
              size={18}
              onPress={onRemove}
            />
          </Row>
        )}
      </Row>

      {!readOnly && entry.kind === 'strength' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={effort ? 'Ocultar esfuerzo' : 'Mostrar esfuerzo opcional'}
          onPress={() => setEffort(!effort)}
        >
          <Text variant="caption" accent>
            {effort ? 'Ocultar esfuerzo · escala de 1 a 10' : '+ Registrar esfuerzo (opcional)'}
          </Text>
        </Pressable>
      ) : null}

      {/* Cabecera de columnas: mismas anchuras que las filas de abajo. En un
          entreno ya cerrado no hay columnas, cada serie va en una línea. */}
      {readOnly ? null : (
        <Row gap={CELL_GAP}>
          <Text variant="overline" faint style={{ width: INDEX_W }}>
            #
          </Text>
          {columns.map((col) => (
            <Text
              key={col.key}
              variant="overline"
              faint
              numberOfLines={1}
              style={{ flex: col.flex, textAlign: 'center' }}
            >
              {col.label}
            </Text>
          ))}
          <View style={{ width: CHECK_W }} />
        </Row>
      )}

      <View style={{ gap: Spacing.two }}>
        {entry.sets.map((set, i) => (
          <SetRow
            key={`${set.id}-${settings.unit}`}
            exerciseName={entry.name}
            set={set}
            index={i + 1}
            columns={columns}
            unit={settings.unit}
            readOnly={readOnly}
            kind={entry.kind}
            onToggle={() => onToggle(set)}
            onChange={(patch) => onChange(set.id, patch)}
            onRemove={() => onRemoveSet(set.id)}
          />
        ))}
      </View>

      {readOnly ? null : (
        <View style={{ gap: 8 }}>
          <Row gap={Spacing.two}>
            <Button
              title="Añadir serie"
              icon="add"
              variant="secondary"
              small
              style={{ flex: 1 }}
              onPress={onAddSet}
            />
            <Pressable
              onPress={cycleRest}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.one + 2,
                height: 38,
                paddingHorizontal: Spacing.three,
                borderRadius: Radius.md,
                backgroundColor: c.surface2,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Ionicons
                name="timer-outline"
                size={15}
                color={entry.restSec ? c.accent : c.textFaint}
              />
              <Text variant="label" dim style={Tabular}>
                {entry.restSec ? formatDuration(entry.restSec) : 'Sin descanso'}
              </Text>
            </Pressable>
          </Row>
          {entry.sets.length > 1 ? (
            <Button
              title="Quitar última serie"
              small
              variant="ghost"
              onPress={() => onRemoveSet(entry.sets[entry.sets.length - 1].id)}
            />
          ) : null}
        </View>
      )}
    </Card>
  );
}

function SetRow({
  exerciseName,
  set,
  index,
  columns,
  kind,
  unit,
  readOnly,
  onToggle,
  onChange,
  onRemove,
}: {
  exerciseName: string;
  set: SetLog;
  index: number;
  columns: Column[];
  kind: SessionEntry['kind'];
  unit: 'kg' | 'lb';
  readOnly: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<SetLog>) => void;
  onRemove: () => void;
}) {
  const c = useTheme();

  const { notify } = useDialog();

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
      <Row gap={CELL_GAP} style={{ minHeight: 28 }}>
        <Text variant="caption" faint style={{ width: INDEX_W }}>
          {index}
        </Text>
        <Text variant="mono" style={{ flex: 1 }} numberOfLines={1}>
          {describeSet(set, kind, unit)}
        </Text>
        {set.rpe ? <Badge label={`RPE ${set.rpe}`} /> : null}
      </Row>
    );
  }

  const state: Record<
    Column['key'],
    {
      value: string;
      set: (v: string) => void;
      commit: (v: string) => void;
      placeholder: string;
      keyboard: 'decimal-pad' | 'numbers-and-punctuation';
    }
  > = {
    weight: {
      value: weight,
      set: setWeight,
      commit: (v) => {
        const parsed = parseNum(v);
        onChange({
          weightKg: parsed == null || parsed < 0 ? null : fromDisplayWeight(parsed, unit),
        });
      },
      // Un guion como marcador: un «0» parecería un valor ya escrito.
      placeholder: '–',
      keyboard: 'decimal-pad',
    },
    reps: {
      value: reps,
      set: setReps,
      commit: (v) => onChange({ reps: parseNum(v) }),
      placeholder: '–',
      keyboard: 'decimal-pad',
    },
    rpe: {
      value: rpe,
      set: setRpe,
      commit: (v) => onChange({ rpe: parseNum(v) }),
      placeholder: '–',
      keyboard: 'decimal-pad',
    },
    km: {
      value: km,
      set: setKm,
      commit: (v) => onChange({ distanceKm: parseNum(v) }),
      placeholder: '–',
      keyboard: 'decimal-pad',
    },
    time: {
      value: time,
      set: setTime,
      commit: (v) => onChange({ durationSec: parseDuration(v) }),
      placeholder: 'mm:ss',
      keyboard: 'numbers-and-punctuation',
    },
  };

  const invalidText = columns.some((col) => {
    const value = state[col.key].value.trim();
    if (!value) return false;
    const parsed = col.key === 'time' ? parseDuration(value) : parseNum(value);
    return (
      parsed == null ||
      parsed < 0 ||
      (col.key === 'rpe' && (parsed < 1 || parsed > 10)) ||
      (col.key === 'reps' && !Number.isInteger(parsed))
    );
  });
  return (
    <View style={{ gap: 6 }}>
      <Row gap={CELL_GAP}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Quitar serie ${index} de ${exerciseName}`}
          onPress={onRemove}
          hitSlop={8}
          style={{ width: INDEX_W }}
        >
          <Text variant="label" faint style={Tabular}>
            {index}
          </Text>
        </Pressable>

        {columns.map((col) => {
          const field = state[col.key];
          return (
            <TextInput
              key={col.key}
              accessibilityLabel={`${exerciseName}, serie ${index}, ${col.label}`}
              value={field.value}
              onChangeText={(v) => {
                field.set(v);
                const parsed = col.key === 'time' ? parseDuration(v) : parseNum(v);
                const invalid =
                  v.trim() !== '' &&
                  (parsed == null ||
                    parsed < 0 ||
                    (col.key === 'rpe' && (parsed < 1 || parsed > 10)) ||
                    (col.key === 'reps' && !Number.isInteger(parsed)));
                field.commit(invalid ? '' : v);
                if (invalid) onChange({ done: false });
              }}
              placeholder={field.placeholder}
              placeholderTextColor={c.textFaint}
              keyboardType={field.keyboard}
              selectTextOnFocus
              style={{
                flex: col.flex,
                // Sin `minWidth: 0` el input no encoge y la fila se sale de la tarjeta.
                minWidth: 0,
                height: ROW_H,
                // La caja se mantiene igual al marcar la serie: solo cambia el
                // color. Si desapareciera, la fila cambiaría de alto y las
                // columnas bailarían.
                backgroundColor: set.done ? c.accentSoft : c.surface2,
                borderRadius: Radius.md,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: set.done ? c.accentDim : c.border,
                textAlign: 'center',
                color: set.done ? c.accent : c.text,
                fontSize: 16,
                fontWeight: '700',
                ...Tabular,
              }}
            />
          );
        })}

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: set.done }}
          accessibilityLabel={`Completar serie ${index} de ${exerciseName}`}
          onPress={() => {
            const invalid = columns.some((col) => {
              const value = state[col.key].value.trim();
              if (!value) return false;
              const parsed = col.key === 'time' ? parseDuration(value) : parseNum(value);
              return (
                parsed == null ||
                parsed < 0 ||
                (col.key === 'rpe' && (parsed < 1 || parsed > 10)) ||
                (col.key === 'reps' && !Number.isInteger(parsed))
              );
            });
            if (invalid) {
              void notify({
                title: 'Revisa los valores',
                message:
                  'Usa valores positivos, repeticiones completas y un esfuerzo entre 1 y 10.',
              });
              return;
            }
            onToggle();
          }}
          style={({ pressed }) => ({
            width: CHECK_W,
            height: ROW_H,
            borderRadius: Radius.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: set.done ? c.accent : c.surface2,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: set.done ? c.accent : c.border,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name="checkmark" size={20} color={set.done ? c.onAccent : c.textFaint} />
        </Pressable>
      </Row>
      {invalidText ? (
        <Text variant="caption" danger accessibilityLiveRegion="polite">
          Revisa los valores: reps completas, esfuerzo de 1 a 10 y ninguna medida negativa.
        </Text>
      ) : null}
    </View>
  );
}
