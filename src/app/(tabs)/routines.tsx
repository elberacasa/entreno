import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useDialog } from '@/components/dialog';
import { WeekSchedule } from '@/components/week-schedule';
import { SchedulePicker } from '@/components/schedule-picker';
import {
  Button,
  Card,
  Field,
  IconButton,
  Row,
  Screen,
  ScreenTitle,
  SectionHeader,
  Sheet,
  Text,
} from '@/components/ui';
import { useTabBarPadding } from '@/hooks/use-tab-bar-padding';
import { useTheme } from '@/hooks/use-theme';
import { pickBackup, saveBackup } from '@/lib/backup-file';
import { exercisesLabel, setsLabel, formatWhen } from '@/lib/format';
import { exportRoutine, parseRoutine } from '@/lib/routine-transfer';
import { useStore } from '@/lib/store';
import type { Routine } from '@/lib/types';

export default function RoutinesScreen() {
  const c = useTheme();
  const paddingBottom = useTabBarPadding();
  const store = useStore();
  const { confirm, notify } = useDialog();
  const [scheduling, setScheduling] = useState<Routine | null>(null);
  const [menu, setMenu] = useState<Routine | null>(null);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [shareText, setShareText] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => {
    try {
      return importText ? parseRoutine(importText) : null;
    } catch {
      return null;
    }
  }, [importText]);
  const start = (routine: Routine) => {
    if (store.activeSession) return router.push(`/session/${store.activeSession.id}`);
    const session = store.startSession({ routineId: routine.id });
    router.push(`/session/${session.id}`);
  };
  const share = async (routine: Routine) => {
    setMenu(null);
    try {
      const text = exportRoutine(routine, store.exercises);
      setShareText(text);
      const result = await saveBackup(text, `abenzagym-rutina-${routine.id}.json`);
      if (result === 'shared' || result === 'downloaded') setShareText('');
      if (result === 'cancelled') setShareText('');
    } catch {
      await notify({
        title: 'No se pudo compartir',
        message:
          'Si aparece el texto de la rutina, puedes copiarlo y enviarlo. Si falta un ejercicio, edita la rutina antes de volver a intentarlo.',
      });
    }
  };
  const loadFile = async () => {
    try {
      const text = await pickBackup();
      if (text) setImportText(text);
    } catch {
      await notify({
        title: 'No se pudo abrir el archivo',
        message: 'Puedes pegar el contenido del archivo en el campo de texto.',
      });
    }
  };
  const importPlan = async () => {
    if (!parsed || busy) return;
    setBusy(true);
    const failed = await store.importRoutine(parsed);
    setBusy(false);
    if (failed)
      return notify({
        title: 'No se pudo guardar',
        message:
          'La rutina original y tu historial siguen intactos. Conserva este archivo e inténtalo de nuevo.',
      });
    setImporting(false);
    setImportText('');
    await notify({
      title: 'Rutina añadida',
      message: `«${parsed.routine.name}» ya está en tu plan. Tus otras rutinas e historial se conservan.`,
    });
  };
  if (!store.ready) return <Screen />;
  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom, gap: 24 }}
      >
        <ScreenTitle
          title="Tu plan"
          right={
            <IconButton
              name="add"
              accessibilityLabel="Crear rutina"
              surface
              onPress={() => router.push('/routine/new')}
            />
          }
        />
        {store.settings.weeklyPlan ? (
          <WeekSchedule />
        ) : (
          <Card tone="accent" style={{ gap: 12 }}>
            <Text variant="title">Una semana completa en un toque.</Text>
            <Text dim>
              Rutinas por músculos, días de entrenamiento y descanso. Todo queda programado.
            </Text>
            <Button
              title="Crear mi semana"
              icon="calendar-outline"
              onPress={() => router.push('/recommended')}
            />
          </Card>
        )}
        <SectionHeader title="Biblioteca personal" />
        <Row gap={10}>
          <Button
            title="Crear a mano"
            icon="add"
            style={{ flex: 1 }}
            onPress={() => router.push('/routine/new')}
          />
          <Button
            title="Importar"
            icon="download-outline"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => setImporting(true)}
          />
        </Row>
        <View style={{ gap: 14 }}>
          <SectionHeader
            title={`Mis rutinas${store.routines.length ? ` (${store.routines.length})` : ''}`}
          />
          {store.routines.length ? (
            store.routines.map((routine, index) => (
              <Card key={routine.id} style={{ padding: 20, gap: 18 }}>
                <Row style={{ alignItems: 'flex-start' }}>
                  <View
                    style={{
                      width: 40,
                      height: 44,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: c.accentSoft,
                    }}
                  >
                    <Text variant="title" accent>
                      {String(index + 1).padStart(2, '0')}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Ver ${routine.name}`}
                    onPress={() => router.push(`/routine-preview/${routine.id}`)}
                    style={{ flex: 1, gap: 5 }}
                  >
                    <Text variant="title">{routine.name}</Text>
                    <Text variant="caption" dim>
                      {exercisesLabel(routine.items.length)} ·{' '}
                      {setsLabel(routine.items.reduce((sum, item) => sum + item.sets, 0))}
                    </Text>
                  </Pressable>
                  <IconButton
                    name="ellipsis-horizontal"
                    accessibilityLabel={`Opciones de ${routine.name}`}
                    onPress={() => setMenu(routine)}
                  />
                </Row>
                <Text dim numberOfLines={2}>
                  {routine.items
                    .map((item) => store.exerciseById(item.exerciseId)?.name)
                    .filter(Boolean)
                    .join(', ')}
                </Text>
                <Row>
                  <Button
                    title={store.activeSession ? 'Volver a la sesión' : 'Entrenar'}
                    icon="play"
                    style={{ flex: 1 }}
                    onPress={() => start(routine)}
                  />
                  <Button
                    title="Programar"
                    variant="secondary"
                    icon="calendar-outline"
                    style={{ flex: 1 }}
                    onPress={() => setScheduling(routine)}
                  />
                </Row>
              </Card>
            ))
          ) : (
            <Card style={{ padding: 24, gap: 12, borderStyle: 'dashed' }}>
              <Text variant="title">Dale forma a tu semana.</Text>
              <Text dim>
                Tu semana crea las rutinas automáticamente. También puedes guardar una rutina propia
                aquí.
              </Text>
              <Button
                title="Crear mi semana"
                variant="secondary"
                onPress={() => router.push('/recommended')}
              />
            </Card>
          )}
        </View>
        {store.upcoming().length ? (
          <View style={{ gap: 12 }}>
            <SectionHeader title="En tu agenda" />
            {store.upcoming().map((item) => (
              <Row
                key={item.id}
                style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: c.border }}
              >
                <Ionicons name="calendar-outline" size={21} color={c.accent} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text variant="heading">
                    {store.routineById(item.routineId)?.name ?? 'Rutina'}
                  </Text>
                  <Text variant="caption" dim>
                    {formatWhen(item.at)}
                  </Text>
                </View>
                <IconButton
                  name="close"
                  accessibilityLabel="Quitar de la agenda"
                  onPress={() => store.unschedule(item.id)}
                />
              </Row>
            ))}
          </View>
        ) : null}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Encuentra tu punto de partida" />
          <Discovery
            title="Configurar mi semana"
            detail="Reparto por músculos y días de descanso"
            icon="compass-outline"
            onPress={() => router.push('/recommended')}
          />
          <Discovery
            title="Biblioteca de rutinas"
            detail="Programas listos para adaptar"
            icon="albums-outline"
            onPress={() => router.push('/routine-catalog')}
          />
          <Discovery
            title="Explorar ejercicios"
            detail="Técnica, material y grupos musculares"
            icon="body-outline"
            onPress={() => router.push('/exercises')}
          />
        </View>
      </ScrollView>
      <Sheet visible={!!menu} title={menu?.name ?? 'Rutina'} onClose={() => setMenu(null)}>
        <Button
          title="Editar rutina"
          variant="secondary"
          icon="create-outline"
          onPress={() => {
            if (menu) router.push(`/routine/${menu.id}`);
            setMenu(null);
          }}
        />
        <Button
          title="Compartir rutina"
          variant="secondary"
          icon="share-outline"
          onPress={() => menu && share(menu)}
        />
        <Text variant="caption" dim>
          Comparte solo el plan y sus ejercicios. Tu historial, peso corporal y ajustes no se
          incluyen.
        </Text>
        <Button
          title="Duplicar rutina"
          variant="secondary"
          icon="copy-outline"
          onPress={() => {
            if (menu) store.duplicateRoutine(menu.id);
            setMenu(null);
          }}
        />
        <Button
          title="Eliminar rutina"
          variant="danger"
          icon="trash-outline"
          onPress={async () => {
            const routine = menu;
            setMenu(null);
            if (
              routine &&
              (await confirm({
                title: 'Eliminar rutina',
                message: `Se elimina «${routine.name}». Tu historial se conserva.`,
                destructive: true,
                confirmText: 'Eliminar',
              }))
            )
              store.deleteRoutine(routine.id);
          }}
        />
      </Sheet>
      <Sheet
        visible={importing}
        title="Importar una rutina"
        onClose={() => !busy && setImporting(false)}
        footer={
          <Button
            title="Añadir a mis rutinas"
            loading={busy}
            disabled={!parsed}
            onPress={importPlan}
          />
        }
      >
        <Text dim>
          Abre un archivo de rutina de AbenzaGym. Se añade a tu plan sin reemplazar nada.
        </Text>
        <Button
          title="Elegir archivo de rutina"
          icon="document-outline"
          variant="secondary"
          onPress={loadFile}
        />
        <Field
          label="O pega el contenido del archivo"
          multiline
          value={importText}
          onChangeText={setImportText}
          style={{ minHeight: 140 }}
          placeholder="Contenido JSON de una rutina"
        />
        {parsed ? (
          <Card tone="accent" style={{ gap: 8 }}>
            <Text variant="title">{parsed.routine.name}</Text>
            <Text>
              {exercisesLabel(parsed.routine.items.length)}. Se añadirá como una nueva rutina.
            </Text>
          </Card>
        ) : importText ? (
          <Text danger>
            No es un archivo de rutina válido. Las copias completas se restauran desde Ajustes.
          </Text>
        ) : null}
      </Sheet>
      <Sheet visible={!!shareText} title="Comparte tu rutina" onClose={() => setShareText('')}>
        <Text dim>
          Si no se pudo guardar el archivo, copia este texto. Tu amigo puede pegarlo en Plan →
          Importar.
        </Text>
        <Field
          label="Contenido de la rutina"
          multiline
          value={shareText}
          editable={false}
          selectTextOnFocus
          style={{ minHeight: 220 }}
        />
      </Sheet>
      <SchedulePicker
        routine={scheduling}
        onClose={() => setScheduling(null)}
        onConfirm={(at) => {
          if (scheduling) store.scheduleRoutine(scheduling.id, at);
          setScheduling(null);
        }}
      />
    </Screen>
  );
}
function Discovery({
  title,
  detail,
  icon,
  onPress,
}: {
  title: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: c.border }}
    >
      <Row>
        <Ionicons name={icon} color={c.accent} size={24} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="heading">{title}</Text>
          <Text variant="caption" dim>
            {detail}
          </Text>
        </View>
        <Ionicons name="chevron-forward" color={c.textDim} size={18} />
      </Row>
    </Pressable>
  );
}
