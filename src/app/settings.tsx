import * as Clipboard from 'expo-clipboard';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Button, Card, Chip, Field, Row, Screen, SectionHeader, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { exercisesLabel, formatDuration, num, parseDuration, parseNum, plural } from '@/lib/format';
import { exportPayload, parseBackup, wipeAll } from '@/lib/storage';
import { useStore } from '@/lib/store';

export default function SettingsScreen() {
  const store = useStore();
  const { settings, exercises, routines, sessions } = store;
  const [busy, setBusy] = useState(false);

  const payload = () =>
    JSON.stringify(exportPayload({ exercises, routines, sessions, settings }), null, 2);

  const exportFile = async () => {
    try {
      setBusy(true);
      const stamp = new Date().toISOString().slice(0, 10);
      const file = new File(Paths.cache, `workout-backup-${stamp}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(payload());

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          UTI: 'public.json',
          dialogTitle: 'Guardar copia de seguridad',
        });
      } else {
        await Clipboard.setStringAsync(payload());
        Alert.alert('Copiado', 'No se puede compartir aquí, así que copié el backup al portapapeles.');
      }
    } catch (e) {
      Alert.alert('No se pudo exportar', String(e));
    } finally {
      setBusy(false);
    }
  };

  const applyBackup = (text: string) => {
    const data = parseBackup(text);
    if (!data) {
      Alert.alert('Archivo no válido', 'Ese contenido no parece una copia de seguridad de la app.');
      return;
    }
    Alert.alert(
      'Restaurar copia',
      `Se reemplazarán tus datos actuales por ${data.sessions.length} entrenos y ${data.routines.length} rutinas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            store.replaceAll(data);
            Alert.alert('Listo', 'Copia restaurada.');
          },
        },
      ],
    );
  };

  const importFile = async () => {
    try {
      setBusy(true);
      const picked = await File.pickFileAsync({ mimeTypes: ['application/json'] });
      if (picked.canceled || !picked.result) return;
      applyBackup(await picked.result.text());
    } catch (e) {
      Alert.alert('No se pudo importar', String(e));
    } finally {
      setBusy(false);
    }
  };

  const importClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (!text.trim()) {
      Alert.alert('Portapapeles vacío', 'Copia primero el contenido del backup.');
      return;
    }
    applyBackup(text);
  };

  const reset = () => {
    Alert.alert(
      'Borrar todos los datos',
      'Se borran rutinas, entrenos y ejercicios propios. Esto no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar todo',
          style: 'destructive',
          onPress: async () => {
            await wipeAll();
            Alert.alert('Datos borrados', 'Cierra y vuelve a abrir la app para empezar de cero.');
          },
        },
      ],
    );
  };

  return (
    <Screen edges={[]}>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.seven }}
        keyboardShouldPersistTaps="handled">
        <SectionHeader title="Unidades" />
        <Card style={{ gap: Spacing.three }}>
          <Text variant="body" dim>
            Los pesos se guardan siempre en kilos; esto solo cambia cómo se muestran e introducen.
          </Text>
          <Row gap={Spacing.two}>
            <Chip
              label="Kilogramos (kg)"
              selected={settings.unit === 'kg'}
              onPress={() => store.updateSettings({ unit: 'kg' })}
            />
            <Chip
              label="Libras (lb)"
              selected={settings.unit === 'lb'}
              onPress={() => store.updateSettings({ unit: 'lb' })}
            />
          </Row>
        </Card>

        <SectionHeader title="Entrenamiento" />
        <Card style={{ gap: Spacing.three }}>
          <Field
            label="Descanso por defecto (mm:ss)"
            defaultValue={formatDuration(settings.defaultRestSec)}
            keyboardType="numbers-and-punctuation"
            onChangeText={(v) => {
              const sec = parseDuration(v);
              if (sec != null) store.updateSettings({ defaultRestSec: sec });
            }}
            containerStyle={{ flex: 0 }}
          />
          <Field
            label={`Peso corporal (${settings.unit})`}
            placeholder="Opcional"
            keyboardType="decimal-pad"
            defaultValue={settings.bodyweightKg != null ? num(settings.bodyweightKg) : ''}
            onChangeText={(v) => store.updateSettings({ bodyweightKg: parseNum(v) })}
            containerStyle={{ flex: 0 }}
          />
        </Card>

        <SectionHeader title="Copia de seguridad" />
        <Card style={{ gap: Spacing.three }}>
          <Text variant="body" dim>
            Todo se guarda solo en este teléfono. Exporta de vez en cuando si no quieres perder el
            historial al cambiar de móvil.
          </Text>
          <View style={{ gap: Spacing.two }}>
            <Button title="Exportar copia" icon="share-outline" loading={busy} onPress={exportFile} />
            <Button
              title="Importar desde archivo"
              icon="document-outline"
              variant="secondary"
              loading={busy}
              onPress={importFile}
            />
            <Button
              title="Copiar backup al portapapeles"
              icon="copy-outline"
              variant="secondary"
              onPress={async () => {
                await Clipboard.setStringAsync(payload());
                Alert.alert('Copiado', 'El backup está en el portapapeles.');
              }}
            />
            <Button
              title="Importar del portapapeles"
              icon="clipboard-outline"
              variant="secondary"
              onPress={importClipboard}
            />
          </View>
          <Text variant="caption" dim>
            {plural(sessions.length, 'entreno', 'entrenos')} ·{' '}
            {plural(routines.length, 'rutina', 'rutinas')} · {exercisesLabel(exercises.length)}
          </Text>
        </Card>

        <SectionHeader title="Zona peligrosa" />
        <Card style={{ gap: Spacing.three }}>
          <Button title="Borrar todos los datos" variant="danger" onPress={reset} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
