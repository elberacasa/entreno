import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useDialog } from '@/components/dialog';
import { ProfileWizard } from '@/components/profile-wizard';
import { SchedulePicker } from '@/components/schedule-picker';
import {
  Button,
  Card,
  EmptyState,
  IconButton,
  Row,
  Screen,
  ScreenTitle,
  SectionHeader,
  Text,
} from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTabBarPadding } from '@/hooks/use-tab-bar-padding';
import { useTheme } from '@/hooks/use-theme';
import { exercisesLabel, formatWhen, plural, setsLabel } from '@/lib/format';
import { useStore } from '@/lib/store';
import { GOAL_LABEL, describeEquipment, type Routine } from '@/lib/types';

export default function RoutinesScreen() {
  const c = useTheme();
  const bottomPadding = useTabBarPadding();
  const { confirm, notify } = useDialog();
  const store = useStore();
  const { routines, exerciseById, deleteRoutine, duplicateRoutine, startSession, activeSession } =
    store;
  const [scheduling, setScheduling] = useState<Routine | null>(null);

  const confirmDelete = async (r: Routine) => {
    const ok = await confirm({
      title: `Borrar «${r.name}»`,
      message: 'La rutina desaparece. Los entrenos que ya hiciste con ella se conservan.',
      confirmText: 'Borrar rutina',
      destructive: true,
    });
    if (ok) deleteRoutine(r.id);
  };

  const start = async (r: Routine) => {
    if (activeSession) {
      const ok = await confirm({
        title: 'Ya hay un entreno abierto',
        message: `Tienes «${activeSession.name}» sin terminar. Ábrelo y ciérralo antes de empezar otro.`,
        confirmText: 'Abrir el actual',
      });
      if (ok) router.push(`/session/${activeSession.id}`);
      return;
    }
    const session = startSession({ routineId: r.id });
    router.push(`/session/${session.id}`);
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.four,
          gap: Spacing.three,
          paddingBottom: bottomPadding,
        }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTitle
          title="Rutinas"
          right={
            <IconButton
              name="add"
              size={22}
              color={c.onAccent}
              onPress={() => router.push('/routine/new')}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: c.accent,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          }
        />

        <PlanCard />

        {/* Antes que el de ejercicios: una rutina hecha resuelve más que un
            ejercicio suelto. */}
        <Button
          title="Catálogo de rutinas"
          icon="albums-outline"
          variant="secondary"
          onPress={() => router.push('/routine-catalog')}
        />

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
              hint="Una rutina es tu plan: los ejercicios, cuántas series y con qué peso o distancia quieres hacerlos. Si prefieres una ya hecha, cópiala del catálogo de rutinas."
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
              const sets = r.items.reduce((acc, i) => acc + (i.sets || 0), 0);

              return (
                <Card key={r.id} style={{ gap: Spacing.three, padding: Spacing.three }}>
                  <Pressable
                    onPress={() => router.push(`/routine/${r.id}`)}
                    style={({ pressed }) => ({ gap: Spacing.two, opacity: pressed ? 0.6 : 1 })}
                  >
                    <Row>
                      <View style={{ flex: 1, gap: Spacing.half }}>
                        <Text variant="title" numberOfLines={1}>
                          {r.name}
                        </Text>
                        <Text variant="caption" faint>
                          {exercisesLabel(r.items.length)} · {setsLabel(sets)}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={c.textFaint} />
                    </Row>
                    {names ? (
                      <Text variant="body" dim numberOfLines={2} style={{ lineHeight: 20 }}>
                        {names}
                        {r.items.length > 4 ? ' …' : ''}
                      </Text>
                    ) : null}
                  </Pressable>

                  {/* Empezar manda; duplicar y borrar quedan como iconos para que
                      no se pulse «Borrar» queriendo entrenar. */}
                  <Row gap={Spacing.two}>
                    <Button
                      title="Empezar"
                      icon="play"
                      style={{ flex: 1 }}
                      onPress={() => start(r)}
                    />
                    <IconButton
                      name="calendar-outline"
                      size={19}
                      surface
                      onPress={() => setScheduling(r)}
                    />
                    <IconButton
                      name="copy-outline"
                      size={19}
                      surface
                      onPress={() => duplicateRoutine(r.id)}
                    />
                    <IconButton
                      name="trash-outline"
                      size={19}
                      surface
                      onPress={() => confirmDelete(r)}
                    />
                  </Row>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>

      <SchedulePicker
        routine={scheduling}
        onClose={() => setScheduling(null)}
        onConfirm={async (at) => {
          if (!scheduling) return;
          store.scheduleRoutine(scheduling.id, at);
          setScheduling(null);
          await notify({
            title: 'Programado',
            message: `«${scheduling.name}» queda para ${formatWhen(at.toISOString()).toLowerCase()}. Lo verás en Hoy cuando se acerque.`,
          });
        }}
      />
    </Screen>
  );
}

/**
 * Puerta de entrada al cuestionario. Mientras no esté contestado invita a
 * hacerlo; después resume las respuestas y lleva al plan.
 */
function PlanCard() {
  const c = useTheme();
  const store = useStore();
  const [wizard, setWizard] = useState({ open: false, seq: 0 });
  const profile = store.settings.profile ?? null;
  const open = () => router.push('/recommended');

  if (!profile) {
    return (
      <>
        <Card tone="accent" style={{ gap: Spacing.three, borderColor: c.accent }}>
          <Row gap={Spacing.three} style={{ alignItems: 'flex-start' }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: Radius.sm,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="sparkles" size={19} color={c.accent} />
            </View>
            <View style={{ flex: 1, gap: Spacing.half }}>
              <Text variant="heading">¿No sabes por dónde empezar?</Text>
              <Text variant="caption" dim style={{ lineHeight: 18 }}>
                Cinco preguntas sobre tu material, tu tiempo y tu objetivo, y te preparo las
                rutinas.
              </Text>
            </View>
          </Row>
          <Button
            title="Hacer el cuestionario"
            icon="sparkles"
            onPress={() => setWizard((w) => ({ open: true, seq: w.seq + 1 }))}
          />
        </Card>

        <ProfileWizard
          key={wizard.seq}
          visible={wizard.open}
          onClose={() => setWizard((w) => ({ ...w, open: false }))}
          onDone={(next) => {
            store.updateSettings({ profile: next });
            setWizard((w) => ({ ...w, open: false }));
            open();
          }}
        />
      </>
    );
  }

  return (
    <Pressable onPress={open}>
      <Card style={{ gap: Spacing.three }}>
        <Row>
          <View style={{ flex: 1, gap: Spacing.half }}>
            <Text variant="overline" faint>
              Tu plan
            </Text>
            <Text variant="heading" numberOfLines={1}>
              {GOAL_LABEL[profile.goal]} · {profile.daysPerWeek} días · {profile.minutesPerSession}{' '}
              min
            </Text>
            <Text variant="caption" faint numberOfLines={1}>
              {describeEquipment(profile.equipment)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.textFaint} />
        </Row>
        <Button
          title="Ver rutinas recomendadas"
          icon="sparkles"
          variant="secondary"
          onPress={open}
        />
      </Card>
    </Pressable>
  );
}
