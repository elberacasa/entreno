import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useDialog } from '@/components/dialog';
import {
  Button,
  Card,
  Divider,
  Field,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  StatTile,
  Text,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { pickBackup, saveBackup } from '@/lib/backup-file';
import { formatDuration, num, parseDuration, parseNum } from '@/lib/format';
import { exportPayload, parseBackup, wipeAll } from '@/lib/storage';
import { useStore } from '@/lib/store';

export default function SettingsScreen() {
  const store = useStore();
  const { confirm, notify } = useDialog();
  const { settings, exercises, routines, sessions, schedule } = store;
  const [busy, setBusy] = useState(false);

  const payload = () =>
    JSON.stringify(exportPayload({ exercises, routines, sessions, schedule, settings }), null, 2);

  const exportFile = async () => {
    // El texto se prepara antes de nada: la hoja de compartir del sistema solo
    // se abre si la llamada sigue contando como respuesta al toque.
    const json = payload();
    const stamp = new Date().toISOString().slice(0, 10);

    try {
      setBusy(true);
      const result = await saveBackup(json, `workout-backup-${stamp}.json`);

      if (result === 'downloaded') {
        await notify({
          title: 'Copia descargada',
          message: 'Está en las descargas de tu navegador. Guárdala donde no se te pierda.',
        });
      } else if (result === 'unsupported') {
        await Clipboard.setStringAsync(json);
        await notify({
          title: 'Copiado al portapapeles',
          message:
            'Aquí no se puede guardar un archivo, así que dejé el backup copiado. Pégalo donde quieras guardarlo.',
        });
      }
    } catch (e) {
      // Si no se pudo sacar el fichero, que al menos no se quede sin copia.
      await Clipboard.setStringAsync(json).catch(() => {});
      await notify({
        title: 'No se pudo exportar',
        message: `${String(e)}

Te dejé el backup copiado al portapapeles por si acaso.`,
      });
    } finally {
      setBusy(false);
    }
  };

  const applyBackup = async (text: string) => {
    const data = parseBackup(text);
    if (!data) {
      await notify({
        title: 'Archivo no válido',
        message: 'Ese contenido no parece una copia de seguridad de la app.',
      });
      return;
    }
    const ok = await confirm({
      title: 'Restaurar copia',
      message: `Se reemplazarán tus datos actuales por ${data.sessions.length} entrenos y ${data.routines.length} rutinas.`,
      confirmText: 'Restaurar',
      destructive: true,
    });
    if (!ok) return;
    store.replaceAll(data);
    await notify({ title: 'Copia restaurada', message: 'Tus datos ya son los del backup.' });
  };

  const importFile = async () => {
    try {
      setBusy(true);
      const text = await pickBackup();
      if (text === null) return;
      await applyBackup(text);
    } catch (e) {
      await notify({ title: 'No se pudo importar', message: String(e) });
    } finally {
      setBusy(false);
    }
  };

  const importClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      await notify({
        title: 'Portapapeles vacío',
        message: 'Copia primero el contenido del backup.',
      });
      return;
    }
    await applyBackup(text);
  };

  const reset = async () => {
    const ok = await confirm({
      title: 'Borrar todos los datos',
      message: 'Se borran rutinas, entrenos y ejercicios propios. Esto no se puede deshacer.',
      confirmText: 'Borrar todo',
      destructive: true,
    });
    if (!ok) return;
    await wipeAll();
    await notify({
      title: 'Datos borrados',
      message: 'Cierra y vuelve a abrir la app para empezar de cero.',
    });
  };

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.four,
          gap: Spacing.three,
          paddingBottom: Spacing.seven,
        }}
        keyboardShouldPersistTaps="handled">
        <SectionHeader title="Tus datos" />
        <Card>
          <Row style={{ alignItems: 'flex-start' }} gap={Spacing.four}>
            <StatTile label="Entrenos" value={String(sessions.length)} accent />
            <StatTile label="Rutinas" value={String(routines.length)} />
            <StatTile label="Ejercicios" value={String(exercises.length)} />
          </Row>
        </Card>

        <SectionHeader title="Unidades" />
        <Card style={{ gap: Spacing.three }}>
          <Segmented<'kg' | 'lb'>
            value={settings.unit}
            onChange={(unit) => store.updateSettings({ unit })}
            options={[
              { value: 'kg', label: 'Kilogramos' },
              { value: 'lb', label: 'Libras' },
            ]}
          />
          <Text variant="caption" dim style={{ lineHeight: 18 }}>
            Los pesos se guardan siempre en kilos; esto solo cambia cómo se muestran e introducen.
          </Text>
        </Card>

        <SectionHeader title="Entrenamiento" />
        <Card style={{ gap: Spacing.four }}>
          <Field
            label="Descanso por defecto (mm:ss)"
            defaultValue={formatDuration(settings.defaultRestSec)}
            keyboardType="numbers-and-punctuation"
            onChangeText={(v) => {
              const sec = parseDuration(v);
              if (sec != null) store.updateSettings({ defaultRestSec: sec });
            }}
            full
          />
          <Field
            label={`Peso corporal (${settings.unit})`}
            placeholder="Opcional"
            keyboardType="decimal-pad"
            defaultValue={settings.bodyweightKg != null ? num(settings.bodyweightKg) : ''}
            onChangeText={(v) => store.updateSettings({ bodyweightKg: parseNum(v) })}
            full
          />
        </Card>

        <SectionHeader title="Copia de seguridad" />
        <Card style={{ gap: Spacing.four }}>
          <Text variant="body" dim style={{ lineHeight: 21 }}>
            Todo se guarda solo en este teléfono. Exporta de vez en cuando si no quieres perder el
            historial al cambiar de móvil.
          </Text>
          <View style={{ gap: Spacing.two }}>
            <Button
              title="Exportar copia"
              icon="share-outline"
              loading={busy}
              onPress={exportFile}
            />
            <Button
              title="Importar desde archivo"
              icon="document-outline"
              variant="secondary"
              loading={busy}
              onPress={importFile}
            />
            <Row gap={Spacing.two}>
              <Button
                title="Copiar backup"
                icon="copy-outline"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={async () => {
                  await Clipboard.setStringAsync(payload());
                  await notify({
                    title: 'Copiado',
                    message: 'El backup está en el portapapeles.',
                  });
                }}
              />
              <Button
                title="Pegar backup"
                icon="clipboard-outline"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={importClipboard}
              />
            </Row>
          </View>
        </Card>

        <SectionHeader title="Zona peligrosa" />
        <Card style={{ gap: Spacing.three }}>
          <Text variant="caption" dim style={{ lineHeight: 18 }}>
            Esto no se puede deshacer. Exporta una copia antes si tienes dudas.
          </Text>
          <Divider />
          <Button title="Borrar todos los datos" variant="danger" onPress={reset} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
