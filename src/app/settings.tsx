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
import { exportPayload, loadAll, parseBackup, readBroken, wipeAll } from '@/lib/storage';
import { useStore } from '@/lib/store';

/**
 * En web `setStringAsync` devuelve si de verdad se copió -el permiso puede no
 * estar-, mientras que en nativo siempre dice que sí. Sin mirarlo, la app
 * puede jurar que tienes una copia que no existe.
 */
async function copy(text: string): Promise<boolean> {
  try {
    return await Clipboard.setStringAsync(text);
  } catch {
    return false;
  }
}

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
        await notify(
          (await copy(json))
            ? {
                title: 'Copiado al portapapeles',
                message:
                  'Aquí no se puede guardar un archivo, así que dejé el backup copiado. Pégalo donde quieras guardarlo.',
              }
            : {
                title: 'No se pudo guardar la copia',
                message:
                  'Ni como archivo ni al portapapeles. Prueba desde Safari en vez de la app instalada, o usa otro navegador.',
              },
        );
      }
    } catch (e) {
      // Si no se pudo sacar el fichero, que al menos no se quede sin copia.
      const copied = await copy(json);
      await notify({
        title: 'No se pudo exportar',
        message: copied
          ? `${String(e)}

Te dejé el backup copiado al portapapeles por si acaso.`
          : `${String(e)}

Tampoco pude copiarlo al portapapeles. No tienes copia: inténtalo desde Safari.`,
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
    // Nada de anunciar la restauración antes de saber si cuajó: decirle a
    // alguien que tiene una copia que no tiene es peor que decirle que falló.
    const failed = await store.replaceAll(data);
    await notify(
      failed
        ? {
            title: 'La copia no se guardó entera',
            message: `Los datos del backup ya se ven en la app, pero falló al guardar ${failed} en el teléfono: si cierras ahora, eso se pierde. Libera espacio y vuelve a importar la copia.`,
          }
        : { title: 'Copia restaurada', message: 'Tus datos ya son los del backup.' },
    );
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
    try {
      setBusy(true);
      // En Safari esto abre el diálogo de pegar del sistema. Si lo cierras o la
      // ventana no tiene el foco, la promesa se rechaza: sin este catch el
      // botón no hacía absolutamente nada y parecía roto.
      const text = await Clipboard.getStringAsync();
      if (!text.trim()) {
        await notify({
          title: 'Portapapeles vacío',
          message: 'Copia primero el contenido del backup.',
        });
        return;
      }
      await applyBackup(text);
    } catch {
      await notify({
        title: 'No se pudo leer el portapapeles',
        message: 'El navegador no dio permiso. Vuelve a intentarlo y acepta el aviso de pegar.',
      });
    } finally {
      setBusy(false);
    }
  };

  /**
   * Lo que no se pudo leer se puede copiar tal cual antes de descartarlo: es
   * el único hilo del que tirar si el JSON solo estaba cortado por la mitad.
   */
  const copyUnreadable = async () => {
    const raw = await readBroken(store.broken);
    await notify(
      (await copy(raw))
        ? {
            title: 'Copiado',
            message:
              'Tienes en el portapapeles lo que la app no supo leer. Pégalo en una nota antes de descartarlo.',
          }
        : {
            title: 'No se pudo copiar',
            message: 'El navegador no dio permiso para escribir en el portapapeles.',
          },
    );
  };

  const discardUnreadable = async () => {
    const ok = await confirm({
      title: 'Descartar lo que no se lee',
      message: `Lo que hay en ${store.readError} se aparta a un lado y la app empieza de cero con eso. Sigue guardado en el teléfono por si algún día se puede rescatar, pero la app ya no lo mirará.`,
      confirmText: 'Descartar',
      destructive: true,
    });
    if (!ok) return;
    const failed = await store.discardBroken();
    await notify(
      failed
        ? {
            title: 'Descartado, pero sin respaldo',
            message: `La app ya vuelve a guardar con normalidad, pero no se pudo apartar lo de ${failed}: si escribes encima, se pierde.`,
          }
        : {
            title: 'Descartado',
            message: 'La app ya vuelve a guardar con normalidad.',
          },
    );
  };

  const reset = async () => {
    const ok = await confirm({
      title: 'Borrar todos los datos',
      message: 'Se borran rutinas, entrenos y ejercicios propios. Esto no se puede deshacer.',
      confirmText: 'Borrar todo',
      destructive: true,
    });
    if (!ok) return;

    try {
      await wipeAll();
    } catch (e) {
      // Si el teléfono no deja borrar, lo que no puede pasar es que la app
      // diga que ya está: los datos siguen ahí y el usuario tiene que saberlo.
      await notify({
        title: 'No se pudieron borrar los datos',
        message: `El teléfono no dejó vaciar el almacenamiento (${String(e)}). Tus datos siguen donde estaban.`,
      });
      return;
    }

    // Borrar el disco no basta: el estado en memoria seguía intacto y la
    // siguiente cosa que tocaras -las unidades, el descanso- lo reescribía
    // entero. Se vuelve a cargar, que es lo mismo que ve una instalación
    // nueva: catálogo de ejercicios y nada más.
    const failed = await store.replaceAll((await loadAll()).data);
    await notify(
      failed
        ? {
            title: 'Datos borrados, pero a medias',
            message: `Se borró todo, aunque falló al guardar ${failed}. La app funciona, pero lo que hagas ahora puede no sobrevivir a cerrarla.`,
          }
        : {
            title: 'Datos borrados',
            message: 'Se fueron las rutinas, los entrenos y los ejercicios que habías añadido.',
          },
    );
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
        {store.broken.length > 0 ? (
          <>
            <SectionHeader title="Datos que no se pudieron leer" />
            <Card style={{ gap: Spacing.four }}>
              <Text variant="body" dim style={{ lineHeight: 21 }}>
                Hay algo guardado en {store.readError} que la app no entiende. Está intacto y no se
                va a sobrescribir, pero mientras siga así no se guardará nada nuevo ahí. Cópialo
                primero por si se puede rescatar, o restaura una copia de seguridad desde aquí
                abajo, que también lo aparta.
              </Text>
              <View style={{ gap: Spacing.two }}>
                <Button
                  title="Copiar lo que no se lee"
                  icon="copy-outline"
                  variant="secondary"
                  onPress={copyUnreadable}
                />
                <Button
                  title="Descartar y empezar de cero"
                  variant="danger"
                  onPress={discardUnreadable}
                />
              </View>
            </Card>
          </>
        ) : null}

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
                  await notify(
                    (await copy(payload()))
                      ? { title: 'Copiado', message: 'El backup está en el portapapeles.' }
                      : {
                          title: 'No se pudo copiar',
                          message:
                            'El navegador no dio permiso para escribir en el portapapeles. Prueba con «Exportar copia».',
                        },
                  );
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
