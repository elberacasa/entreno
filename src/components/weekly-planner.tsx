import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { DemoThumb, ExerciseDemoSheet } from '@/components/exercise-demo';
import { Button, Card, Chip, Row, Sheet, Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useStore } from '@/lib/store';
import {
  buildWeeklyPlan,
  DAY_NAMES,
  DEFAULT_DAYS,
  GYM_EQUIPMENT,
  MUSCLE_FOCUS,
  primaryGroups,
  QUICK_PROFILE,
  TRAINING_SOURCE,
  WEEKDAYS,
  weeklyCoverage,
  supportsSplit,
} from '@/lib/weekly-plan';
import {
  EQUIPMENT_LABEL,
  EQUIPMENT_ORDER,
  type Equipment,
  type Exercise,
  type TrainingProfile,
} from '@/lib/types';

export function WeeklyPlanner({ welcome = false }: { welcome?: boolean }) {
  const c = useTheme();
  const store = useStore();
  const [profile, setProfile] = useState<TrainingProfile>(() => ({
    ...(store.settings.profile ?? QUICK_PROFILE),
    daysPerWeek: Math.max(2, store.settings.profile?.daysPerWeek ?? 3),
  }));
  const [weekdays, setWeekdays] = useState(() =>
    !supportsSplit(profile.equipment, store.exercises) &&
    (store.settings.profile?.daysPerWeek ?? 3) > 3
      ? DEFAULT_DAYS[3]
      : (store.settings.weeklyPlan?.days.map((d) => d.weekday) ??
        DEFAULT_DAYS[Math.max(2, store.settings.profile?.daysPerWeek ?? 3)]),
  );
  const [focus, setFocus] = useState(store.settings.weeklyPlan?.focus ?? 'Equilibrado');
  const [adjusting, setAdjusting] = useState(false);
  const [customEquipment, setCustomEquipment] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [demo, setDemo] = useState<Exercise | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingRef = useRef(false);
  const maxDays = supportsSplit(profile.equipment, store.exercises) ? 6 : 3;
  const changeEquipment = (equipment: Equipment[]) => {
    setProfile((p) => ({ ...p, equipment }));
    if (!supportsSplit(equipment, store.exercises) && weekdays.length > 3)
      setWeekdays(DEFAULT_DAYS[3]);
  };
  const draft = useMemo(
    () => buildWeeklyPlan(profile, weekdays, focus, store.exercises),
    [profile, weekdays, focus, store.exercises],
  );
  const equipmentName =
    profile.equipment.length === 0
      ? 'Sin material'
      : GYM_EQUIPMENT.every((e) => profile.equipment.includes(e))
        ? 'Gimnasio'
        : profile.equipment.length === 1 && profile.equipment[0] === 'dumbbells'
          ? 'Mancuernas'
          : 'Material personalizado';
  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    const failed = await store.saveWeeklyPlan(draft, profile, focus);
    savingRef.current = false;
    setSaving(false);
    if (failed) {
      setError(
        'No se pudo guardar. Tu plan anterior sigue intacto. Mantén esta pantalla abierta y vuelve a intentarlo.',
      );
      return;
    }
    if (!welcome) router.replace('/');
  };
  const toggleDay = (day: number) => {
    setWeekdays((current) => {
      const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
      return next.length >= 2 && next.length <= maxDays ? next : current;
    });
  };
  return (
    <View style={{ gap: 22 }}>
      <View style={{ gap: 10 }}>
        <Text variant="display">
          {welcome ? 'Tu primera semana,\nlista para entrenar.' : 'Dale forma a tu semana.'}
        </Text>
        <Text dim>
          Elige un punto de partida. Guardamos las rutinas y repartimos los días por ti.
        </Text>
      </View>
      <Card style={{ gap: 15, padding: 18 }}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Ionicons name="calendar-outline" size={25} color={c.accent} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="heading">
              {weekdays.length} días · {profile.minutesPerSession} min · {equipmentName}
            </Text>
            <Text variant="caption" dim>
              {profile.experience === 'beginner' ? 'Para empezar' : 'Ya entreno'} ·{' '}
              {focus === 'Equilibrado' ? 'Todo el cuerpo' : `Prioridad: ${focus.toLowerCase()}`}
            </Text>
          </View>
          <Button title="Ajustar" variant="secondary" small onPress={() => setAdjusting(true)} />
        </Row>
        <Text variant="caption" dim>
          {draft.explanation}
        </Text>
        {draft.warnings.map((warning) => (
          <Text key={warning} variant="caption" accessibilityRole="alert">
            {warning}
          </Text>
        ))}
        <Button
          title={
            store.settings.weeklyPlan ? 'Guardar cambios de la semana' : 'Usar este plan semanal'
          }
          icon="checkmark"
          loading={saving}
          disabled={draft.days.some((d) => !d.plan.items.length)}
          onPress={save}
        />
        {error ? (
          <Text danger accessibilityRole="alert">
            {error}
          </Text>
        ) : null}
        <Text variant="caption" dim>
          {store.settings.weeklyPlan
            ? 'Actualiza las rutinas de tu semana. El historial se conserva.'
            : 'Se repite cada semana. Puedes cambiar días y ejercicios después.'}
        </Text>
      </Card>
      <View style={{ gap: 4 }}>
        <Text variant="title">Así queda tu semana</Text>
        <Text variant="caption" dim>
          Toca una sesión para ver ejercicios, series y músculos.
        </Text>
      </View>
      <View>
        {WEEKDAYS.map((weekday) => {
          const day = draft.days.find((d) => d.weekday === weekday);
          const open = expanded === weekday;
          return (
            <View key={weekday} style={{ borderBottomWidth: 1, borderColor: c.border }}>
              <Pressable
                accessibilityRole={day ? 'button' : undefined}
                accessibilityLabel={
                  day ? `${DAY_NAMES[weekday]}: ${day.plan.name}, ver ejercicios` : undefined
                }
                aria-expanded={day ? open : undefined}
                disabled={!day}
                onPress={() => setExpanded(open ? null : weekday)}
                style={({ pressed }) => ({
                  paddingVertical: day ? 17 : 10,
                  opacity: pressed ? 0.65 : 1,
                })}
              >
                <Row gap={14}>
                  <Text variant="label" style={{ width: 34, color: day ? c.accent : c.textDim }}>
                    {DAY_NAMES[weekday].slice(0, 3)}
                  </Text>
                  <View
                    style={{
                      width: 3,
                      height: day ? 38 : 18,
                      borderRadius: 2,
                      backgroundColor: day ? c.accent : c.border,
                    }}
                  />
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text variant={day ? 'heading' : 'caption'} dim={!day}>
                      {day?.plan.name ?? 'Descanso'}
                    </Text>
                    {day ? (
                      <Text variant="caption" dim>
                        {day.plan.items.length} ejercicios · aprox. {day.plan.minutes} min
                      </Text>
                    ) : null}
                  </View>
                  {day ? (
                    <Ionicons
                      name={open ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={c.textDim}
                    />
                  ) : null}
                </Row>
              </Pressable>
              {day && open ? (
                <View style={{ gap: 15, paddingBottom: 20, paddingLeft: 8 }}>
                  <Text variant="caption" accent>
                    {primaryGroups(day.plan.items, store.exercises).join(' · ')}
                  </Text>
                  {day.plan.items.map((item) => (
                    <Pressable
                      key={item.exerciseId}
                      accessibilityRole="button"
                      accessibilityLabel={`Ver técnica de ${item.name}`}
                      onPress={() => setDemo(store.exerciseById(item.exerciseId) ?? null)}
                    >
                      <Row gap={12}>
                        <DemoThumb exerciseId={item.exerciseId} size={52} />
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text variant="heading">{item.name}</Text>
                          <Text variant="caption" dim>
                            {store.exerciseById(item.exerciseId)?.group} · descanso {item.restSec} s
                          </Text>
                        </View>
                        <Text variant="label">
                          {item.sets} × {item.reps ?? `${item.durationSec} s`}
                        </Text>
                      </Row>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={{ gap: 12 }}>
        <Text variant="title">Reparto por músculos</Text>
        <Text variant="caption" dim>
          Series previstas por grupo principal. Los músculos que ayudan en un ejercicio no se suman
          de nuevo.
        </Text>
        {weeklyCoverage(draft, store.exercises).map((row) => (
          <Row key={row.group}>
            <Text style={{ flex: 1 }}>{row.group}</Text>
            <Text variant="caption" dim>
              {row.days} días
            </Text>
            <Text variant="label" style={{ width: 66, textAlign: 'right' }}>
              {row.sets} series
            </Text>
          </Row>
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Text variant="heading">Un punto de partida con criterio</Text>
        <Text variant="caption" dim>
          La guía ACSM 2026 recomienda trabajar los grupos musculares principales al menos dos veces
          por semana. El reparto y las dosis de esta app son plantillas iniciales, no una medición
          de tu recuperación.
        </Text>
        <Text variant="caption" dim>
          Empieza con una carga que controles. Las series compuestas también implican otros
          músculos; mostramos el grupo principal, sin inventar porcentajes de recuperación.
        </Text>
        <Pressable accessibilityRole="link" onPress={() => Linking.openURL(TRAINING_SOURCE)}>
          <Text variant="caption" accent>
            Consultar la guía ACSM 2026
          </Text>
        </Pressable>
      </View>
      <Sheet
        visible={adjusting}
        title="Tu semana, a tu medida"
        onClose={() => setAdjusting(false)}
        footer={<Button title="Ver mi semana" onPress={() => setAdjusting(false)} />}
      >
        <Text variant="heading">¿Cuántos días?</Text>
        <Row gap={8}>
          {[2, 3, 4, 5, 6]
            .filter((n) => n <= maxDays)
            .map((n) => (
              <Chip
                key={n}
                label={`${n}`}
                selected={weekdays.length === n}
                onPress={() => {
                  setWeekdays(DEFAULT_DAYS[n]);
                  setProfile((p) => ({ ...p, daysPerWeek: n }));
                }}
              />
            ))}
        </Row>
        <Text variant="caption" dim>
          O toca los días que te vienen bien (entre 2 y {maxDays}).
        </Text>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {WEEKDAYS.map((d) => (
            <Chip
              key={d}
              label={DAY_NAMES[d].slice(0, 3)}
              selected={weekdays.includes(d)}
              onPress={() => toggleDay(d)}
            />
          ))}
        </Row>
        <Text variant="heading">¿Dónde entrenas?</Text>
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {[
            { label: 'Gimnasio', equipment: GYM_EQUIPMENT },
            { label: 'Mancuernas', equipment: ['dumbbells'] as const },
            { label: 'Sin material', equipment: [] },
          ].map((preset) => (
            <Chip
              key={preset.label}
              label={preset.label}
              selected={equipmentName === preset.label}
              onPress={() => changeEquipment([...preset.equipment])}
            />
          ))}
        </Row>
        <Button
          title={customEquipment ? 'Ocultar material' : 'Personalizar material'}
          variant="ghost"
          small
          onPress={() => setCustomEquipment((open) => !open)}
        />
        {customEquipment ? (
          <View>
            <Row style={{ flexWrap: 'wrap' }} gap={6}>
              {EQUIPMENT_ORDER.filter((e) => e !== 'cardioMachine' && e !== 'outdoors').map((e) => (
                <Chip
                  key={e}
                  label={EQUIPMENT_LABEL[e]}
                  selected={profile.equipment.includes(e)}
                  onPress={() =>
                    changeEquipment(
                      profile.equipment.includes(e)
                        ? profile.equipment.filter((v) => v !== e)
                        : [...profile.equipment, e],
                    )
                  }
                />
              ))}
            </Row>
          </View>
        ) : null}
        <Text variant="heading">Tiempo por sesión</Text>
        <Row gap={8}>
          {[30, 45, 60].map((n) => (
            <Chip
              key={n}
              label={`${n} min`}
              selected={profile.minutesPerSession === n}
              onPress={() => setProfile((p) => ({ ...p, minutesPerSession: n }))}
            />
          ))}
        </Row>
        <Text variant="heading">Prioridad muscular</Text>
        <Text variant="caption" dim>
          Da más espacio a una zona sin quitar los movimientos básicos del resto.
        </Text>
        <Row style={{ flexWrap: 'wrap' }} gap={8}>
          {MUSCLE_FOCUS.map((group) => (
            <Chip
              key={group}
              label={group === 'Equilibrado' ? 'Todo el cuerpo' : group}
              selected={focus === group}
              onPress={() => setFocus(group)}
            />
          ))}
        </Row>
        <Text variant="heading">Experiencia</Text>
        <Row gap={8}>
          <Chip
            label="Estoy empezando"
            selected={profile.experience === 'beginner'}
            onPress={() => setProfile((p) => ({ ...p, experience: 'beginner' }))}
          />
          <Chip
            label="Ya entreno"
            selected={profile.experience !== 'beginner'}
            onPress={() => setProfile((p) => ({ ...p, experience: 'regular' }))}
          />
        </Row>
      </Sheet>
      <ExerciseDemoSheet exercise={demo} onClose={() => setDemo(null)} />
    </View>
  );
}
