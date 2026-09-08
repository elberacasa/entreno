/**
 * Guardar y elegir el fichero de copia de seguridad.
 *
 * expo-file-system es solo nativo: en web no existe (ni `Paths.cache` ni
 * `File.pickFileAsync`), y llamarlo revienta con un TypeError. Como la app se
 * usa sobre todo instalada en el iPhone, que es web, cada operación tiene su
 * camino propio y el de nativo se queda para cuando se compile de verdad.
 */
import { File as NativeFile, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

/** Qué acabó pasando, para poder contárselo al usuario sin mentirle. */
export type SaveResult =
  /** Se abrió la hoja de compartir del sistema. */
  | 'shared'
  /** El navegador se lo descargó. */
  | 'downloaded'
  /** El usuario cerró la hoja de compartir. */
  | 'cancelled'
  /** Aquí no hay forma de sacar un fichero; queda el portapapeles. */
  | 'unsupported';

function isAbort(e: unknown): boolean {
  return e instanceof Error && e.name === 'AbortError';
}

export async function saveBackup(json: string, filename: string): Promise<SaveResult> {
  return Platform.OS === 'web' ? saveOnWeb(json, filename) : saveOnNative(json, filename);
}

async function saveOnWeb(json: string, filename: string): Promise<SaveResult> {
  const blob = new Blob([json], { type: 'application/json' });

  // En iOS la hoja de compartir es la única vía decente: lleva a «Guardar en
  // Archivos». Hay que llamarla sin esperar nada antes o el navegador ya no la
  // considera respuesta a un toque.
  const file = new globalThis.File([blob], filename, { type: 'application/json' });
  if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
      // Si falla por cualquier otra razón, todavía queda la descarga.
    }
  }

  if (typeof document === 'undefined') return 'unsupported';

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Sin revocar, el blob se queda en memoria hasta recargar.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

async function saveOnNative(json: string, filename: string): Promise<SaveResult> {
  const file = new NativeFile(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  file.write(json);

  if (!(await Sharing.isAvailableAsync())) return 'unsupported';

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/json',
    UTI: 'public.json',
    dialogTitle: 'Guardar copia de seguridad',
  });
  return 'shared';
}

/** Devuelve el contenido del fichero elegido, o null si no eligió ninguno. */
export async function pickBackup(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    const picked = await NativeFile.pickFileAsync({ mimeTypes: ['application/json'] });
    if (picked.canceled || !picked.result) return null;
    return picked.result.text();
  }

  if (typeof document === 'undefined') return null;

  return new Promise<string | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    let done = false;
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      window.removeEventListener('focus', onFocus);
      input.remove();
      resolve(value);
    };

    // Cancelar el diálogo no dispara `change`. `cancel` es reciente, así que
    // además se vigila la vuelta a la ventana: sin ella el botón se quedaría
    // ocupado para siempre.
    const onFocus = () => setTimeout(() => finish(null), 500);

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return finish(null);
      file.text().then(finish, () => finish(null));
    };
    input.oncancel = () => finish(null);

    window.addEventListener('focus', onFocus);
    document.body.appendChild(input);
    input.click();
  });
}
