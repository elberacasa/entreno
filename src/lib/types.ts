/** Tipos de ejercicio soportados por la app. */
export type ExerciseKind =
  /** Series con repeticiones y peso (press banca, sentadilla...). */
  | 'strength'
  /** Distancia y tiempo (correr, bici, remo...). */
  | 'cardio'
  /** Solo duración (plancha, colgado, movilidad, estiramientos). */
  | 'time';

export const KIND_LABEL: Record<ExerciseKind, string> = {
  strength: 'Fuerza',
  cardio: 'Cardio',
  time: 'Tiempo',
};

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  group: string;
  custom?: boolean;
}

/** Una línea planificada dentro de una rutina. */
export interface PlanItem {
  id: string;
  exerciseId: string;
  sets: number;
  reps?: number | null;
  weightKg?: number | null;
  distanceKm?: number | null;
  durationSec?: number | null;
  restSec?: number | null;
  notes?: string;
}

export interface Routine {
  id: string;
  name: string;
  notes?: string;
  items: PlanItem[];
  createdAt: string;
  updatedAt: string;
}

/** Una serie realmente ejecutada. */
export interface SetLog {
  id: string;
  done: boolean;
  reps?: number | null;
  weightKg?: number | null;
  distanceKm?: number | null;
  durationSec?: number | null;
  rpe?: number | null;
}

export interface SessionEntry {
  id: string;
  exerciseId: string;
  name: string;
  kind: ExerciseKind;
  restSec?: number | null;
  notes?: string;
  sets: SetLog[];
}

export interface Session {
  id: string;
  routineId?: string | null;
  name: string;
  startedAt: string;
  finishedAt?: string | null;
  notes?: string;
  entries: SessionEntry[];
}

export interface Settings {
  unit: 'kg' | 'lb';
  defaultRestSec: number;
  bodyweightKg?: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  defaultRestSec: 120,
  bodyweightKg: null,
};

/** "Pecho · Fuerza", pero solo "Cardio" cuando grupo y tipo coinciden. */
export function describeExercise(e: Pick<Exercise, 'group' | 'kind'>): string {
  const kind = KIND_LABEL[e.kind];
  return e.group === kind ? e.group : `${e.group} · ${kind}`;
}
