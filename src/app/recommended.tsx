import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useDialog } from '@/components/dialog';
import { ProfileWizard } from '@/components/profile-wizard';
import {
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  EmptyState,
  Row,
  Screen,
  SectionHeader,
  Text,
} from '@/components/ui';
import { Radius, Spacing, Tabular } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDuration, plural } from '@/lib/format';
import { buildPlan, planDayToRoutine, uniqueName, type PlanDay, type PlannedItem } from '@/lib/recommend';
import { useStore } from '@/lib/store';
import {
  GOAL_HINT,
  GOAL_LABEL,
  GOAL_ORDER,
  describeEquipment,
  type Goal,
  type TrainingProfile,
} from '@/lib/types';

/** "4 × 8", "3 × 0:45" o "12:00" según lo que se registre en ese ejercicio. */
function describePlanned(item: PlannedItem): string {
  if (item.kind === 'cardio') return formatDuration(item.durationSec);
  if (item.durationSec != null) return `${item.sets} × ${formatDuration(item.durationSec)}`;
  return `${item.sets} × ${item.reps}`;
}

const KIND_ICON = {
  strength: 'barbell' as const,
  cardio: 'walk' as const,
  time: 'stopwatch' as const,
};

export default function RecommendedScreen() {
  const store = useStore();

  if (!store.ready) return <Screen />;

  return <Recommended />;
}

function Recommended() {
  const c = useTheme();
  const store = useStore();
  const { notify } = useDialog();
  const [wizard, setWizard] = useState({ open: false, seq: 0 });

  const profile = store.settings.profile ?? null;

  const plan = useMemo(
    () => (profile ? buildPlan(profile, store.exercises) : null),
    [profile, store.exercises],
  );

  const openWizard = () => setWizard((w) => ({ open: true, seq: w.seq + 1 }));

  const saveProfile = (next: TrainingProfile) => {
    store.updateSettings({ profile: next });
    setWizard((w) => ({ ...w, open: false }));
  };

  const setGoal = (goal: Goal) => {
    if (!profile) return;
    store.updateSettings({ profile: { ...profile, goal, updatedAt: new Date().toISOString() } });
  };

  const addDays = async (days: PlanDay[]) => {
    if (!profile) return;
    // Los nombres se calculan sobre la marcha para que dos días del mismo plan
    // no acaben llamándose igual.
    const taken = store.routines.map((r) => r.name);
    for (const day of days) {
      const name = uniqueName(day.name, taken);
      taken.push(name);
      store.upsertRoutine(planDayToRoutine(day, profile, name));
    }
    await notify({
      title: days.length === 1 ? 'Rutina añadida' : `${days.length} rutinas añadidas`,
      message: 'Ya las tienes en Rutinas, listas para empezar. Puedes editarlas como cualquier otra.',
    });
    router.back();
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Plan recomendado' }} />

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.four,
          gap: Spacing.three,
          paddingBottom: Spacing.seven,
        }}
        showsVerticalScrollIndicator={false}>
        {!profile ? (
          <Card>
            <EmptyState
              icon="clipboard-outline"
              title="Todavía no sé nada de ti"
              hint="Responde cuatro preguntas sobre tu material, tu tiempo y tu objetivo y te preparo el plan."
              action="Empezar cuestionario"
              onAction={openWizard}
            />
          </Card>
        ) : (
          <>
            <Card style={{ gap: Spacing.three }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ flex: 1, gap: Spacing.half }}>
                  <Text variant="overline" faint>
                    Tus respuestas
                  </Text>
                  <Text variant="title">
                    {profile.daysPerWeek} días · {profile.minutesPerSession} min
                  </Text>
                </View>
                <Button title="Cambiar" icon="create-outline" variant="secondary" small onPress={openWizard} />
              </Row>
              <Text variant="caption" dim style={{ lineHeight: 18 }}>
                {describeEquipment(profile.equipment)}
              </Text>
            </Card>

            <SectionHeader title="Objetivo" />
            <Card style={{ gap: Spacing.three }}>
              <Row style={{ flexWrap: 'wrap' }} gap={Spacing.two}>
                {GOAL_ORDER.map((g) => (
                  <Chip
                    key={g}
                    label={GOAL_LABEL[g]}
                    selected={profile.goal === g}
                    onPress={() => setGoal(g)}
                  />
                ))}
              </Row>
              <Text variant="body" dim style={{ lineHeight: 21 }}>
                {GOAL_HINT[profile.goal]}
              </Text>
            </Card>

            {plan && plan.warnings.length > 0 ? (
              <Card tone="accent" style={{ gap: Spacing.two }}>
                {plan.warnings.map((w, i) => (
                  <Row key={i} gap={Spacing.two} style={{ alignItems: 'flex-start' }}>
                    <Ionicons
                      name="alert-circle-outline"
                      size={16}
                      color={c.accent}
                      style={{ marginTop: 2 }}
                    />
                    <Text variant="caption" dim style={{ flex: 1, lineHeight: 18 }}>
                      {w}
                    </Text>
                  </Row>
                ))}
              </Card>
            ) : null}

            <SectionHeader
              title={`${plural(plan?.days.length ?? 0, 'sesión', 'sesiones')} por semana`}
            />

            {plan?.days.map((day) => (
              <Card key={day.key} style={{ gap: Spacing.three, padding: Spacing.three }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, gap: Spacing.half }}>
                    <Text variant="title" numberOfLines={1}>
                      {day.name}
                    </Text>
                    <Text variant="caption" faint>
                      {plural(day.items.length, 'ejercicio', 'ejercicios')} · ~{day.minutes} min
                    </Text>
                  </View>
                  <Badge label={`${day.minutes}′`} tone="accent" />
                </Row>

                <Divider />

                <View style={{ gap: Spacing.three }}>
                  {day.items.map((item, i) => (
                    <Row key={`${item.exerciseId}-${i}`} gap={Spacing.three}>
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: Radius.sm,
                          backgroundColor: c.surface2,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons name={KIND_ICON[item.kind]} size={15} color={c.textDim} />
                      </View>
                      <View style={{ flex: 1, gap: Spacing.half }}>
                        <Text variant="body" numberOfLines={1}>
                          {item.name}
                        </Text>
                        {item.restSec > 0 ? (
                          <Text variant="caption" faint>
                            descanso {formatDuration(item.restSec)}
                          </Text>
                        ) : null}
                      </View>
                      <Text variant="label" style={Tabular}>
                        {describePlanned(item)}
                      </Text>
                    </Row>
                  ))}
                </View>

                <Button
                  title="Añadir esta rutina"
                  icon="add"
                  variant="secondary"
                  small
                  onPress={() => addDays([day])}
                />
              </Card>
            ))}

            {plan && plan.days.length > 0 ? (
              <Button
                title={`Añadir las ${plan.days.length} rutinas`}
                icon="checkmark-done"
                onPress={() => addDays(plan.days)}
              />
            ) : null}

            <Text variant="caption" faint style={{ lineHeight: 17, paddingHorizontal: Spacing.one }}>
              Los pesos los pones tú en el primer entreno: empieza con algo que puedas mover con
              buena técnica y ve subiendo. La app te enseñará lo que hiciste la última vez.
            </Text>
          </>
        )}
      </ScrollView>

      <ProfileWizard
        key={wizard.seq}
        visible={wizard.open}
        initial={profile}
        onClose={() => setWizard((w) => ({ ...w, open: false }))}
        onDone={saveProfile}
      />
    </Screen>
  );
}
