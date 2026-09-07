import AsyncStorage from '@react-native-async-storage/async-storage';

import { LEGACY_SEED_COUNT, SEED_COUNT, SEED_EQUIPMENT, seedExercises } from '@/lib/seed';
import {
  DEFAULT_SETTINGS,
  type Exercise,
  type Routine,
  type Session,
  type Settings,
} from '@/lib/types';

const KEYS = {
  exercises: 'wk.exercises.v1',
  routines: 'wk.routines.v1',
  sessions: 'wk.sessions.v1',
  settings: 'wk.settings.v1',
} as const;

export interface AppData {
  exercises: Exercise[];
  routines: Routine[];
  sessions: Session[];
  settings: Settings;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function loadAll(): Promise<AppData> {
  const [exercises, routines, sessions, settings] = await Promise.all([
    readJson<Exercise[] | null>(KEYS.exercises, null),
    readJson<Routine[]>(KEYS.routines, []),
    readJson<Session[]>(KEYS.sessions, []),
    readJson<Settings>(KEYS.settings, DEFAULT_SETTINGS),
  ]);

  const merged: Settings = { ...DEFAULT_SETTINGS, ...settings };

  const catalog = exercises
    ? // Ya había catálogo: solo le sumamos los ejercicios incorporados al
      // catálogo inicial desde la última vez. Los que el usuario haya borrado
      // no vuelven, porque `seedVersion` ya los da por copiados.
      [...withEquipment(exercises), ...seedExercises(merged.seedVersion ?? LEGACY_SEED_COUNT)]
    : // La primera vez no hay nada guardado: sembramos el catálogo entero.
      seedExercises();

  if (merged.seedVersion !== SEED_COUNT) {
    merged.seedVersion = SEED_COUNT;
    void save.settings(merged);
    void save.exercises(catalog);
  }

  return { exercises: catalog, routines, sessions, settings: merged };
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
  settings: (v: Settings) => AsyncStorage.setItem(KEYS.settings, JSON.stringify(v)),
};

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
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
    };
  } catch {
    return null;
  }
}
