import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { useDialog } from '@/components/dialog';
import { DemoThumb, ExerciseDemoSheet } from '@/components/exercise-demo';
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
  Sheet,
  Text,
} from '@/components/ui';
import { Spacing, Tabular } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { describePlanned, exercisesLabel, formatDuration, plural } from '@/lib/format';
import { uid } from '@/lib/id';
import { uniqueName } from '@/lib/recommend';
import {
  CATALOG_ROUTINES,
  LEVEL_LABEL,
  LEVEL_ORDER,
  ZONE_LABEL,
  ZONE_ORDER,
  catalogEquipment,
  catalogMinutes,
  missingEquipment,
  type CatalogRoutine,
  type Level,
  type Zone,
} from '@/lib/routine-catalog';
import { useStore } from '@/lib/store';
import {
  EQUIPMENT_HINT,
  EQUIPMENT_LABEL,
  describeEquipment,
  type Equipment,
  type Exercise,
  type PlanItem,
} from '@/lib/types';

export default function RoutineCatalogScreen() {
  const store = useStore();

  // Sin esta guarda, en una recarga en frío el catálogo se pintaría con el
  // almacén vacío: ninguna rutina aparecería como «ya la tienes» y los
  // ejercicios saldrían todos como borrados.
  if (!store.ready) return <Screen />;

  return <RoutineCatalog />;
}

function RoutineCatalog() {
  const c = useTheme();
  const store = useStore();
  const { notify } = useDialog();

  const [level, setLevel] = useState<Level | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);
  const [onlyMine, setOnlyMine] = useState(false);
  const [detail, setDetail] = useState<CatalogRoutine | null>(null);
  const [demo, setDemo] = useState<Exercise | null>(null);

  const profile = store.settings.profile ?? null;
  const available: Equipment[] = profile?.equipment ?? [];

  const filtered = useMemo(
    () =>
      CATALOG_ROUTINES.filter((r) => (level ? r.level === level : true))
        .filter((r) => (zone ? r.zone === zone : true))
        .filter((r) =>
          onlyMine && profile ? missingEquipment(r, profile.equipment).length === 0 : true,
        ),
    [level, zone, onlyMine, profile],
  );

  /** Rutinas ya copiadas, por el catálogo del que salieron. */
  const copied = useMemo(
    () => new Set(store.routines.map((r) => r.sourceId).filter(Boolean)),
    [store.routines],
  );

  const add = async (routine: CatalogRoutine) => {
    // El usuario puede haber borrado ejercicios del catálogo: los que ya no
    // existan se caen de la copia.
    const resolved = routine.items.filter((item) => store.exerciseById(item.exerciseId));
    const dropped = routine.items.length - resolved.length;

    // El detalle se cierra antes de avisar de nada: el diálogo también es un
    // Modal y en web se dibuja por debajo del que ya estaba abierto, así que
    // con el Sheet delante el aviso no se ve y parece que el botón no hace
    // nada. Del catálogo no se sale: lo normal es copiar dos o tres rutinas
    // de una tanda.
    setDetail(null);

    // Comprobamos antes de escribir: una rutina vacía no le sirve a nadie, y
    // decir «añadida» de algo que no se ha creado es peor que no añadirla.
    if (resolved.length === 0) {
      await notify({
        title: 'No puedo añadirla',
        message: `Ninguno de los ejercicios de «${routine.name}» sigue en tu catálogo. Vuelve a crearlos desde Catálogo de ejercicios y podrás copiarla.`,
      });
      return;
    }

    const now = new Date().toISOString();
    const name = uniqueName(
      routine.name,
      store.routines.map((r) => r.name),
    );
    const items: PlanItem[] = resolved.map((item) => ({
      id: uid('pi-'),
      exerciseId: item.exerciseId,
      sets: item.sets,
      reps: item.reps ?? null,
      durationSec: item.durationSec ?? null,
      restSec: item.restSec,
    }));

    const saving = store.upsertRoutine({
      id: uid('rt-'),
      name,
      notes: `${LEVEL_LABEL[routine.level]} · ${ZONE_LABEL[routine.zone]} · del catálogo`,
      sourceId: routine.id,
      items,
      createdAt: now,
      updatedAt: now,
    });

    const incomplete =
      dropped > 0
        ? ` Añadida sin ${plural(dropped, 'ejercicio', 'ejercicios')} que ya no tienes en tu catálogo.`
        : '';

    const failed = await saving;
    if (failed) {
      await notify({
        title: 'Añadida, pero sin guardar',
        message: `«${name}» está en Rutinas, pero el teléfono no ha podido guardar ${failed}: si cierras la app se pierde. Copia el backup desde Ajustes antes de seguir.${incomplete}`,
      });
      return;
    }

    await notify({
      title: 'Añadida a tus rutinas',
      message: `«${name}» ya está en Rutinas, lista para empezar. Puedes editarla como cualquier otra.${incomplete}`,
    });
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: 'Catálogo de rutinas' }} />

      <ScrollView
        contentContainerStyle={{
          padding: Spacing.four,
          gap: Spacing.three,
          paddingBottom: Spacing.seven,
        }}
        showsVerticalScrollIndicator={false}>
        <SectionHeader title="Nivel" />
        <Row gap={Spacing.two}>
          <Chip label="Todos" selected={level === null} onPress={() => setLevel(null)} />
          {LEVEL_ORDER.map((l) => (
            <Chip
              key={l}
              label={LEVEL_LABEL[l]}
              selected={level === l}
              onPress={() => setLevel(level === l ? null : l)}
            />
          ))}
        </Row>

        <SectionHeader title="Zona" />
        {/* En horizontal porque son ocho y no caben en el ancho del móvil. */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Spacing.two }}>
          <Chip label="Todas" selected={zone === null} onPress={() => setZone(null)} />
          {ZONE_ORDER.map((z) => (
            <Chip
              key={z}
              label={ZONE_LABEL[z]}
              selected={zone === z}
              onPress={() => setZone(zone === z ? null : z)}
            />
          ))}
        </ScrollView>

        <Row style={{ justifyContent: 'space-between' }}>
          <Text variant="caption" dim>
            {plural(filtered.length, 'rutina', 'rutinas')}
          </Text>
          {/* Sin cuestionario contestado no sabemos qué material tiene. */}
          {profile ? (
            <Chip
              label="Solo con mi material"
              icon="construct-outline"
              selected={onlyMine}
              onPress={() => setOnlyMine((v) => !v)}
            />
          ) : null}
        </Row>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon="funnel-outline"
              title="Nada con ese material"
              hint="Ninguna de estas rutinas se puede hacer con lo que marcaste. Quita el filtro para verlas todas."
            />
          </Card>
        ) : (
          filtered.map((routine) => {
            const names = routine.items
              .map((i) => store.exerciseById(i.exerciseId)?.name)
              .filter(Boolean)
              .slice(0, 4)
              .join(' · ');
            const missing = profile ? missingEquipment(routine, available) : [];

            return (
              <Pressable
                key={routine.id}
                onPress={() => setDetail(routine)}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
                <Card style={{ gap: Spacing.two, padding: Spacing.three }}>
                  <Row>
                    <Text variant="title" numberOfLines={1} style={{ flex: 1 }}>
                      {routine.name}
                    </Text>
                    {copied.has(routine.id) ? (
                      <Badge label="Ya la tienes" tone="success" />
                    ) : null}
                    {/* El acento marca la exigencia, no la calidad. */}
                    <Badge
                      label={LEVEL_LABEL[routine.level]}
                      tone={routine.level === 'hard' ? 'accent' : 'neutral'}
                    />
                  </Row>

                  <Text variant="caption" faint>
                    {ZONE_LABEL[routine.zone]} · {exercisesLabel(routine.items.length)} · ~
                    {catalogMinutes(routine)} min
                  </Text>

                  {names ? (
                    <Text variant="body" dim numberOfLines={2} style={{ lineHeight: 20 }}>
                      {names}
                      {routine.items.length > 4 ? ' …' : ''}
                    </Text>
                  ) : null}

                  {/* El material va siempre, no solo cuando falta algo: es lo
                      que permite descartar una rutina sin abrirla. */}
                  <Row gap={Spacing.two} style={{ alignItems: 'flex-start' }}>
                    <Ionicons
                      name="barbell-outline"
                      size={14}
                      color={c.textFaint}
                      style={{ marginTop: 2 }}
                    />
                    <Text variant="caption" faint numberOfLines={2} style={{ flex: 1 }}>
                      {describeEquipment(catalogEquipment(routine))}
                    </Text>
                  </Row>

                  {missing.length > 0 ? (
                    <Text variant="caption" style={{ color: c.warn }}>
                      Te falta: {missing.map((e) => EQUIPMENT_LABEL[e]).join(' · ')}
                    </Text>
                  ) : null}
                </Card>
              </Pressable>
            );
          })
        )}

        <Text variant="caption" faint style={{ lineHeight: 17, paddingHorizontal: Spacing.one }}>
          Añadir una rutina hace una copia tuya: los pesos, las series y los ejercicios los cambias
          después sin tocar el catálogo.
        </Text>
      </ScrollView>

      <Sheet
        visible={detail != null}
        onClose={() => setDetail(null)}
        title={detail?.name ?? ''}
        footer={
          detail ? (
            <Button title="Añadir a mis rutinas" icon="add" onPress={() => add(detail)} />
          ) : null
        }>
        {detail ? <Detail routine={detail} onPickExercise={setDemo} /> : null}
      </Sheet>

      <ExerciseDemoSheet exercise={demo} onClose={() => setDemo(null)} />
    </Screen>
  );
}

/**
 * Qué hace falta para hacer la rutina, pieza a pieza y con la misma pista que
 * usa el cuestionario. Con el perfil contestado marca lo que tienes y lo que
 * no; sin contestar no marca nada, porque no sabemos qué tiene y no vamos a
 * pintarle en ámbar un banco que a lo mejor está en su gimnasio.
 */
function EquipmentList({ routine }: { routine: CatalogRoutine }) {
  const c = useTheme();
  const profile = useStore().settings.profile ?? null;
  const needed = catalogEquipment(routine);

  if (needed.length === 0) {
    return (
      <EquipmentRow
        icon="checkmark-circle-outline"
        color={c.success}
        label="Peso corporal"
        hint="No hace falta nada: se puede hacer en cualquier sitio."
      />
    );
  }

  return (
    <View style={{ gap: Spacing.three }}>
      {needed.map((item) => {
        // `null` = no lo sabemos, que no es lo mismo que «no lo tiene».
        const has = profile ? profile.equipment.includes(item) : null;
        return (
          <EquipmentRow
            key={item}
            icon={
              has == null
                ? 'ellipse-outline'
                : has
                  ? 'checkmark-circle-outline'
                  : 'close-circle-outline'
            }
            color={has == null ? c.textFaint : has ? c.success : c.warn}
            label={EQUIPMENT_LABEL[item]}
            labelColor={has === false ? c.warn : undefined}
            hint={EQUIPMENT_HINT[item]}
          />
        );
      })}
    </View>
  );
}

function EquipmentRow({
  icon,
  color,
  label,
  labelColor,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  label: string;
  labelColor?: string;
  hint: string;
}) {
  return (
    <Row gap={Spacing.three} style={{ alignItems: 'flex-start' }}>
      <Ionicons name={icon} size={18} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: Spacing.half }}>
        <Text variant="body" style={labelColor ? { color: labelColor } : undefined}>
          {label}
        </Text>
        <Text variant="caption" faint style={{ lineHeight: 17 }}>
          {hint}
        </Text>
      </View>
    </Row>
  );
}

/** Ficha entera de una rutina del catálogo, con sus ejercicios. */
function Detail({
  routine,
  onPickExercise,
}: {
  routine: CatalogRoutine;
  onPickExercise: (exercise: Exercise) => void;
}) {
  const store = useStore();

  return (
    <>
      <Row gap={Spacing.two} style={{ flexWrap: 'wrap' }}>
        <Badge
          label={LEVEL_LABEL[routine.level]}
          tone={routine.level === 'hard' ? 'accent' : 'neutral'}
        />
        <Badge label={ZONE_LABEL[routine.zone]} />
        <Badge label={`~${catalogMinutes(routine)} min`} />
      </Row>

      <Text variant="body" dim style={{ lineHeight: 21 }}>
        {routine.summary}
      </Text>

      <SectionHeader title="Material" />
      <EquipmentList routine={routine} />

      <Divider />

      <View style={{ gap: Spacing.three }}>
        {routine.items.map((item, i) => {
          const exercise = store.exerciseById(item.exerciseId);
          return (
            <Pressable
              key={`${item.exerciseId}-${i}`}
              onPress={() => (exercise ? onPickExercise(exercise) : null)}
              disabled={!exercise}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
              <Row gap={Spacing.three}>
                <DemoThumb exerciseId={item.exerciseId} size={34} />
                <View style={{ flex: 1, gap: Spacing.half }}>
                  <Text variant="body" numberOfLines={1} dim={!exercise}>
                    {/* Si lo borró del catálogo, se lo decimos aquí: al copiar
                        la rutina esa línea no va a estar. */}
                    {exercise?.name ?? 'Ejercicio que ya no tienes'}
                  </Text>
                  {item.restSec > 0 ? (
                    <Text variant="caption" faint>
                      descanso {formatDuration(item.restSec)}
                    </Text>
                  ) : null}
                </View>
                <Text variant="label" style={Tabular}>
                  {describePlanned({ kind: exercise?.kind, ...item })}
                </Text>
              </Row>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}
