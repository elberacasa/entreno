import AsyncStorage from '@react-native-async-storage/async-storage';

import { appDataSchema, dataSchemas, snapshotSchema } from '@/lib/validation';

import { LEGACY_SEED_COUNT, SEED_COUNT, SEED_EQUIPMENT, seedExercises } from '@/lib/seed';
import {
  DEFAULT_SETTINGS,
  type Exercise,
  type Routine,
  type ScheduledSession,
  type Session,
  type Settings,
} from '@/lib/types';

export const SNAPSHOT_KEY = 'wk.data.v2';
const RECOVERY_KEY = 'wk.recovery.v2';
let lastSnapshot: string | null | undefined;

export const KEYS = {
  exercises: 'wk.exercises.v1',
  routines: 'wk.routines.v1',
  sessions: 'wk.sessions.v1',
  schedule: 'wk.schedule.v1',
  settings: 'wk.settings.v1',
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

/** Cómo se llama cada cosa cuando hay que contárselo al usuario. */
export const KEY_LABEL: Record<StorageKey, string> = {
  [KEYS.exercises]: 'los ejercicios',
  [KEYS.routines]: 'las rutinas',
  [KEYS.sessions]: 'los entrenos',
  [KEYS.schedule]: 'la agenda',
  [KEYS.settings]: 'los ajustes',
};

/** Dónde se aparta lo que no se pudo leer cuando el usuario decide descartarlo. */
const brokenKeyFor = (key: StorageKey) => `${key}.roto`;

export interface AppData {
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  schedule: ScheduledSession[];
  settings: Settings;
}

export interface LoadResult {
  data: AppData;
  /**
   * Claves cuyo contenido está guardado pero no se pudo interpretar. No es lo
   * mismo que estar vacío: aquí hay algo del usuario, así que quien reciba
   * esto tiene que dejar de escribir encima hasta que él decida.
   */
  broken: StorageKey[];
}

type ReadResult<T> =
  /** `value: null` significa que no había nada guardado, que es normal. */
  | { ok: true; value: T | null }
  /** Había algo y no se pudo leer. El original se queda intacto. */
  | { ok: false };

/**
 * Lee una clave distinguiendo los dos «no hay datos» que antes se confundían:
 * no haber guardado nunca nada, y tener algo guardado que no se puede
 * interpretar. Devolver el mismo valor por defecto en los dos casos hacía que
 * la primera escritura borrase para siempre lo que no se supo leer.
 */
async function readJson<T>(key: StorageKey): Promise<ReadResult<T>> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(key);
  } catch {
    // Ni siquiera se pudo mirar: puede haber datos ahí, así que no es vacío.
    return { ok: false };
  }
  if (raw == null || raw === '') return { ok: true, value: null };
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch {
    return { ok: false };
  }
}

export async function loadAll(): Promise<LoadResult> {
  const allKeys = Object.values(KEYS);
  const empty: AppData = {
    exercises: seedExercises(),
    routines: [],
    sessions: [],
    schedule: [],
    settings: { ...DEFAULT_SETTINGS },
  };
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    lastSnapshot = raw;
    if (raw != null) {
      const parsed = snapshotSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) return { data: empty, broken: allKeys };
      return { data: prepareCatalog(parsed.data.data), broken: [] };
    }
  } catch {
    return { data: empty, broken: allKeys };
  }

  // Read the original keys without modifying them. The first successful save
  // migrates to one atomic snapshot; the legacy copy remains recoverable.
  const fields = Object.keys(KEYS) as (keyof AppData)[];
  const results = await Promise.all(fields.map((field) => readJson<unknown>(KEYS[field])));
  const data = { ...empty };
  const broken: StorageKey[] = [];
  fields.forEach((field, index) => {
    const result = results[index];
    if (!result.ok) {
      broken.push(KEYS[field]);
      return;
    }
    if (result.value == null) return;
    if (field === 'settings' && (typeof result.value !== 'object' || Array.isArray(result.value))) {
      broken.push(KEYS[field]);
      return;
    }
    const candidate =
      field === 'settings'
        ? { ...DEFAULT_SETTINGS, ...(typeof result.value === 'object' ? result.value : {}) }
        : result.value;
    const parsed = dataSchemas[field].safeParse(candidate);
    if (!parsed.success) {
      broken.push(KEYS[field]);
      return;
    }
    Object.assign(data, { [field]: parsed.data });
  });
  return { data: prepareCatalog(data), broken };
}

function prepareCatalog(data: AppData): AppData {
  return {
    ...data,
    exercises: addMissing(
      withEquipment(data.exercises),
      seedExercises(data.settings.seedVersion ?? LEGACY_SEED_COUNT),
    ),
    sessions: [...data.sessions].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)),
    settings: { ...data.settings, seedVersion: SEED_COUNT },
  };
}

/** Serialize operations so an older asynchronous write cannot win. */
let pendingWrite: Promise<void> = Promise.resolve();
export function saveSnapshot(data: AppData): Promise<void> {
  const payload = JSON.stringify({ version: 2, data });
  const commit = async () => {
    const current = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (lastSnapshot !== undefined && current !== lastSnapshot) {
      throw new Error(
        'Los datos han cambiado en otra pestaña. Exporta los cambios pendientes antes de recargar.',
      );
    }
    await AsyncStorage.setItem(SNAPSHOT_KEY, payload);
    lastSnapshot = payload;
  };
  const next = pendingWrite
    .catch(() => {})
    .then(() =>
      typeof navigator !== 'undefined' && navigator.locks
        ? navigator.locks.request('entreno-snapshot', commit)
        : commit(),
    );
  pendingWrite = next;
  return next;
}

/**
 * Añade los del catálogo inicial que falten, por id. Sin esto, una siembra a
 * medias -ejercicios guardados y `seedVersion` no- los duplicaría en el
 * siguiente arranque.
 */
function addMissing(list: Exercise[], incoming: Exercise[]): Exercise[] {
  const known = new Set(list.map((e) => e.id));
  return [...list, ...incoming.filter((e) => !known.has(e.id))];
}

/**
 * Los ejercicios guardados antes de que existiera el cuestionario no llevan
 * material. Se lo rellenamos desde el catálogo inicial para que el generador
 * de rutinas sepa cuáles se pueden hacer; los ejercicios propios se quedan sin
 * material, que equivale a "solo peso corporal" y siempre está disponible.
 */
function withEquipment(list: Exercise[]): Exercise[] {
  return list.map((e) => ({
    ...e,
    equipment: !e.custom && SEED_EQUIPMENT[e.id] ? SEED_EQUIPMENT[e.id] : (e.equipment ?? []),
  }));
}

/** Texto crudo de lo que no se pudo leer, para poder enseñárselo al usuario. */
export async function readBroken(keys: StorageKey[]): Promise<string> {
  const snapshot = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (snapshot != null) return snapshot;
  const parts = await Promise.all(
    keys.map(async (key) => {
      try {
        return `--- ${key} (${KEY_LABEL[key]}) ---\n${(await AsyncStorage.getItem(key)) ?? '(vacío)'}`;
      } catch {
        return `--- ${key} (${KEY_LABEL[key]}) ---\n(no se pudo leer)`;
      }
    }),
  );
  return parts.join('\n\n');
}

/**
 * Aparta lo ilegible a una clave paralela en vez de borrarlo. Es la única
 * forma de que escribir encima siga siendo recuperable: el original sigue en
 * el teléfono aunque la app ya no lo mire.
 *
 * Devuelve las claves que no se pudieron apartar, para no prometer un respaldo
 * que no existe.
 */
export async function stashBroken(keys: StorageKey[]): Promise<StorageKey[]> {
  try {
    const snapshot = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (snapshot != null) {
      await AsyncStorage.setItem(RECOVERY_KEY, snapshot);
      // Keep the source until a replacement snapshot has been saved.
      return [];
    }
  } catch {
    return keys;
  }
  const failed: StorageKey[] = [];
  for (const key of keys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw != null) await AsyncStorage.setItem(brokenKeyFor(key), raw);
      // Preserve the source as well until a new snapshot supersedes it.
    } catch {
      failed.push(key);
    }
  }
  return failed;
}

export async function wipeAll(): Promise<void> {
  await pendingWrite.catch(() => {});
  const drafts = (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith('wk.draft.'));
  await AsyncStorage.multiRemove([
    ...drafts,
    ...Object.values(KEYS),
    SNAPSHOT_KEY,
    RECOVERY_KEY,
    ...Object.values(KEYS).map(brokenKeyFor),
    'wk.rest.v1',
  ]);
  lastSnapshot = null;
}

export function exportPayload(data: AppData) {
  return {
    app: 'workout-app',
    version: 1,
    exportedAt: new Date().toISOString(),
    ...data,
  };
}

/** Valida un JSON de backup; devuelve null si no tiene la forma esperada. */
export function parseBackup(text: string): AppData | null {
  try {
    const raw = JSON.parse(text);
    if (!raw || typeof raw !== 'object') return null;
    if (raw.app !== 'workout-app' || raw.version !== 1) return null;
    if (raw.settings != null && (typeof raw.settings !== 'object' || Array.isArray(raw.settings)))
      return null;
    const parsed = appDataSchema.safeParse({
      ...raw,
      routines: raw.routines ?? [],
      schedule: raw.schedule ?? [],
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
    });
    return parsed.success ? prepareCatalog(parsed.data) : null;
  } catch {
    return null;
  }
}

/* --------------------------------------------------------------------------
 * Descanso en curso
 *
 * Vive fuera de `AppData` a propósito: no es un dato del usuario que haya que
 * exportar en la copia de seguridad, solo el estado de la cuenta atrás para
 * que sobreviva a salir de la sesión o a recargar la app en mitad del gimnasio.
 * ------------------------------------------------------------------------ */

const REST_KEY = 'wk.rest.v1';

export interface RestState {
  /** Momento en el que termina el descanso, en epoch ms. */
  endsAt: number;
  /** Duración total, para pintar la barra de progreso. */
  total: number;
}

/**
 * Un descanso muy pasado ya no interesa a nadie: si vuelves al día siguiente
 * no tiene sentido que la app te reciba con «descanso terminado».
 */
export const REST_STALE_MS = 10 * 60 * 1000;

export async function loadRest(): Promise<RestState | null> {
  let raw: string | null;
  try {
    raw = await AsyncStorage.getItem(REST_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<RestState>;
    if (typeof parsed?.endsAt !== 'number' || !Number.isFinite(parsed.endsAt)) return null;
    if (Date.now() - parsed.endsAt > REST_STALE_MS) return null;
    return { endsAt: parsed.endsAt, total: typeof parsed.total === 'number' ? parsed.total : 0 };
  } catch {
    return null;
  }
}

/**
 * Guardar el descanso es "si se puede": perderlo no pierde nada del entreno,
 * así que no enciende el aviso de guardado fallido ni bloquea nada.
 */
export function saveRest(rest: RestState | null): void {
  try {
    const write = rest
      ? AsyncStorage.setItem(REST_KEY, JSON.stringify(rest))
      : AsyncStorage.removeItem(REST_KEY);
    void write.catch(() => {});
  } catch {
    // Ni eso: seguimos con la cuenta atrás solo en memoria.
  }
}
