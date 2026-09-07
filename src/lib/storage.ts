import AsyncStorage from '@react-native-async-storage/async-storage';

import { seedExercises } from '@/lib/seed';
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

  return {
    // La primera vez no hay nada guardado: sembramos el catálogo por defecto.
    exercises: exercises ?? seedExercises(),
    routines,
    sessions,
    settings: { ...DEFAULT_SETTINGS, ...settings },
  };
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
      exercises: raw.exercises,
      routines: Array.isArray(raw.routines) ? raw.routines : [],
      sessions: raw.sessions,
      settings: { ...DEFAULT_SETTINGS, ...(raw.settings ?? {}) },
    };
  } catch {
    return null;
  }
}
