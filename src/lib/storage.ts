import AsyncStorage from '@react-native-async-storage/async-storage';

import { LEGACY_SEED_COUNT, SEED_COUNT, SEED_EQUIPMENT, seedExercises } from '@/lib/seed';
import {
  DEFAULT_SETTINGS,
  type Exercise,
  type Routine,
  type ScheduledSession,
  type Session,
  type Settings,
} from '@/lib/types';

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
  const [exercises, routines, sessions, schedule, settings] = await Promise.all([
    readJson<Exercise[]>(KEYS.exercises),
    readJson<Routine[]>(KEYS.routines),
    readJson<Session[]>(KEYS.sessions),
    readJson<ScheduledSession[]>(KEYS.schedule),
    readJson<Settings>(KEYS.settings),
  ]);

  const broken: StorageKey[] = [];
  const value = <T,>(key: StorageKey, read: ReadResult<T>): T | null => {
    if (read.ok) return read.value;
    broken.push(key);
    return null;
  };

  const storedExercises = value(KEYS.exercises, exercises);
  const storedSettings = value(KEYS.settings, settings);
  const merged: Settings = { ...DEFAULT_SETTINGS, ...storedSettings };

  const catalog = storedExercises
    ? // Ya había catálogo: solo le sumamos los ejercicios incorporados al
      // catálogo inicial desde la última vez. Los que el usuario haya borrado
      // no vuelven, porque `seedVersion` ya los da por copiados.
      addMissing(
        withEquipment(storedExercises),
        seedExercises(merged.seedVersion ?? LEGACY_SEED_COUNT),
      )
    : // La primera vez no hay nada guardado: sembramos el catálogo entero.
      seedExercises();

  // La siembra solo se da por hecha si de verdad llegó al disco, y con los
  // ejercicios delante: `seedVersion` es justo la nota de que ya están
  // copiados, así que guardarlo antes que ellos los perdería para siempre si
  // la segunda escritura fallara.
  const canSeed = !broken.includes(KEYS.exercises) && !broken.includes(KEYS.settings);
  if (merged.seedVersion !== SEED_COUNT && canSeed) {
    try {
      await save.exercises(catalog);
      merged.seedVersion = SEED_COUNT;
      await save.settings(merged);
    } catch {
      // Si no cuaja se reintenta al próximo arranque; el catálogo ya está en
      // memoria y `addMissing` evita duplicarlo cuando vuelva a pasar por aquí.
      merged.seedVersion = storedSettings?.seedVersion;
    }
  }

  return {
    data: {
      exercises: catalog,
      routines: value(KEYS.routines, routines) ?? [],
      sessions: value(KEYS.sessions, sessions) ?? [],
      schedule: value(KEYS.schedule, schedule) ?? [],
      settings: merged,
    },
    broken,
  };
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
  return list.map((e) => (e.equipment ? e : { ...e, equipment: SEED_EQUIPMENT[e.id] ?? [] }));
}

export const save = {
  exercises: (v: Exercise[]) => AsyncStorage.setItem(KEYS.exercises, JSON.stringify(v)),
  routines: (v: Routine[]) => AsyncStorage.setItem(KEYS.routines, JSON.stringify(v)),
  sessions: (v: Session[]) => AsyncStorage.setItem(KEYS.sessions, JSON.stringify(v)),
  schedule: (v: ScheduledSession[]) => AsyncStorage.setItem(KEYS.schedule, JSON.stringify(v)),
  settings: (v: Settings) => AsyncStorage.setItem(KEYS.settings, JSON.stringify(v)),
};

/** Texto crudo de lo que no se pudo leer, para poder enseñárselo al usuario. */
export async function readBroken(keys: StorageKey[]): Promise<string> {
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
  const failed: StorageKey[] = [];
  for (const key of keys) {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw != null) await AsyncStorage.setItem(brokenKeyFor(key), raw);
      await AsyncStorage.removeItem(key);
    } catch {
      failed.push(key);
    }
  }
  return failed;
}

export async function wipeAll(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(KEYS));
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
    if (!Array.isArray(raw.exercises) || !Array.isArray(raw.sessions)) return null;
    return {
      exercises: withEquipment(raw.exercises),
      routines: Array.isArray(raw.routines) ? raw.routines : [],
      sessions: raw.sessions,
      // Las copias hechas antes de la agenda no traen este campo.
      schedule: Array.isArray(raw.schedule) ? raw.schedule : [],
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
    };
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
    const write = rest ? AsyncStorage.setItem(REST_KEY, JSON.stringify(rest)) : AsyncStorage.removeItem(REST_KEY);
    void write.catch(() => {});
  } catch {
    // Ni eso: seguimos con la cuenta atrás solo en memoria.
  }
}
