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

/**
 * Material necesario para hacer un ejercicio. El peso corporal no está en la
 * lista: se da por hecho que siempre lo tienes, así que un ejercicio sin
 * material (`[]`) se puede hacer en cualquier sitio.
 */
export type Equipment =
  | 'dumbbells'
  | 'barbell'
  | 'bench'
  | 'pullupBar'
  | 'machines'
  | 'cardioMachine'
  | 'outdoors'
  | 'abWheel';

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  dumbbells: 'Mancuernas',
  barbell: 'Barra y discos',
  bench: 'Banco',
  pullupBar: 'Barra de dominadas',
  machines: 'Máquinas y poleas',
  cardioMachine: 'Máquinas de cardio',
  outdoors: 'Calle o pista',
  abWheel: 'Rueda abdominal',
};

export const EQUIPMENT_HINT: Record<Equipment, string> = {
  dumbbells: 'Un par de mancuernas, fijas o regulables',
  barbell: 'Barra olímpica con discos',
  bench: 'Banco plano o regulable',
  pullupBar: 'Barra fija, jaula o estación de fondos',
  machines: 'Gimnasio con poleas y máquinas',
  cardioMachine: 'Cinta, bici estática, elíptica o remo',
  outdoors: 'Sitio para correr o montar en bici',
  abWheel: 'Rueda para ejercicios abdominales',
};

export const EQUIPMENT_ORDER: Equipment[] = [
  'dumbbells',
  'barbell',
  'bench',
  'pullupBar',
  'machines',
  'cardioMachine',
  'outdoors',
  'abWheel',
];

/** Qué busca el usuario. Cambia series, repeticiones, descansos y cardio. */
export type Goal = 'muscle' | 'fat' | 'strength' | 'performance';

export const GOAL_LABEL: Record<Goal, string> = {
  muscle: 'Masa muscular',
  fat: 'Perder grasa',
  strength: 'Fuerza',
  performance: 'Rendimiento',
};

export const GOAL_HINT: Record<Goal, string> = {
  muscle: 'Series de 8 a 12 repeticiones y descansos medios: el volumen que hace crecer.',
  fat: 'Los mismos básicos y descansos suficientes para no perder fuerza, con cardio al final. Entrenar solo mueve poco la balanza; lo que conservas aquí es el músculo.',
  strength: 'Pocas repeticiones con peso alto y descansos largos para levantar más.',
  performance: 'Mezcla de fuerza y cardio, con descansos medios y trabajo continuo.',
};

export const GOAL_ORDER: Goal[] = ['muscle', 'fat', 'strength', 'performance'];

/** Respuestas del cuestionario: con qué cuentas y qué quieres conseguir. */
export interface TrainingProfile {
  experience?: 'beginner' | 'regular';
  equipment: Equipment[];
  daysPerWeek: number;
  minutesPerSession: number;
  goal: Goal;
  updatedAt: string;
}

export const DEFAULT_PROFILE: Omit<TrainingProfile, 'updatedAt'> = {
  equipment: [],
  daysPerWeek: 3,
  minutesPerSession: 60,
  goal: 'muscle',
};

export interface Exercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  group: string;
  /** Material que hace falta. Vacío = solo peso corporal. */
  equipment?: Equipment[];
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
  /**
   * Rutina del catálogo de la que se copió, si vino de ahí. Sirve para marcar
   * en el catálogo las que ya tienes; por nombre no valdría, porque se
   * renombran. Es opcional: las rutinas y las copias de seguridad anteriores
   * siguen cargando igual.
   */
  sourceId?: string;
  createdAt: string;
  updatedAt: string;
}

/** Una rutina puesta en la agenda para un día y una hora concretos. */
export interface ScheduledSession {
  id: string;
  routineId: string;
  /** Momento en ISO. Se guarda con la hora local del día elegido. */
  at: string;
  createdAt: string;
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
  lastBackupAt?: string;
  unit: 'kg' | 'lb';
  defaultRestSec: number;
  bodyweightKg?: number | null;
  /** Respuestas del cuestionario de rutinas. `null` mientras no lo conteste. */
  profile?: TrainingProfile | null;
  /**
   * Cuántos ejercicios del catálogo inicial se han copiado ya a este
   * dispositivo. Permite añadir ejercicios nuevos en futuras versiones sin
   * resucitar los que el usuario haya borrado. Sin definir = instalación
   * anterior al cuestionario.
   */
  seedVersion?: number;
}

export const DEFAULT_SETTINGS: Settings = {
  unit: 'kg',
  defaultRestSec: 120,
  bodyweightKg: null,
  profile: null,
};

/** "Pecho · Fuerza", pero solo "Cardio" cuando grupo y tipo coinciden. */
export function describeExercise(e: Pick<Exercise, 'group' | 'kind'>): string {
  const kind = KIND_LABEL[e.kind];
  return e.group === kind ? e.group : `${e.group} · ${kind}`;
}

/** "Barra y discos · Banco", o "Peso corporal" cuando no hace falta nada. */
export function describeEquipment(equipment?: Equipment[]): string {
  if (!equipment || equipment.length === 0) return 'Peso corporal';
  return equipment.map((e) => EQUIPMENT_LABEL[e]).join(' · ');
}

/** ¿Se puede hacer con lo que hay? Hace falta todo lo que el ejercicio pide. */
export function canDoWith(exercise: Pick<Exercise, 'equipment'>, available: Equipment[]): boolean {
  return (exercise.equipment ?? []).every((item) => available.includes(item));
}
