import { uid } from '@/lib/id';
import { GROUP_PATTERN, SEED_META, type Pattern, type Tier } from '@/lib/seed';
import {
  GOAL_LABEL,
  canDoWith,
  type Exercise,
  type Goal,
  type PlanItem,
  type Routine,
  type TrainingProfile,
} from '@/lib/types';

/** Una línea del plan generado, todavía sin guardar como rutina. */
export interface PlannedItem {
  exerciseId: string;
  name: string;
  kind: Exercise['kind'];
  sets: number;
  reps: number | null;
  durationSec: number | null;
  restSec: number;
}

export interface PlanDay {
  /** Identificador estable dentro del plan; sirve de clave en las listas. */
  key: string;
  name: string;
  focus: string;
  items: PlannedItem[];
  /** Duración estimada en minutos, calentamiento incluido. */
  minutes: number;
}

export interface Plan {
  days: PlanDay[];
  /** Avisos honestos sobre lo que no se ha podido cubrir. */
  warnings: string[];
}

interface Dose {
  sets: number;
  reps: number;
  restSec: number;
}

interface Prescription {
  compound: Dose;
  accessory: Dose;
  /** Minutos de cardio al final de cada sesión; 0 si el objetivo no lo pide. */
  cardioMin: number;
  /** Segundos de trabajo por serie, para estimar cuánto dura la sesión. */
  workSec: number;
  /** Duración de las series de tiempo (planchas y demás). */
  holdSec: number;
}

/**
 * Cómo cambia el entrenamiento según lo que buscas. Son los rangos clásicos:
 * poco peso y muchas repeticiones aguantan más trabajo por minuto, mucho peso
 * y pocas repeticiones necesitan descansos largos.
 */
const PRESCRIPTION: Record<Goal, Prescription> = {
  muscle: {
    compound: { sets: 4, reps: 8, restSec: 120 },
    accessory: { sets: 3, reps: 12, restSec: 75 },
    cardioMin: 0,
    workSec: 45,
    holdSec: 45,
  },
  strength: {
    compound: { sets: 5, reps: 5, restSec: 180 },
    accessory: { sets: 3, reps: 8, restSec: 120 },
    cardioMin: 0,
    workSec: 40,
    holdSec: 45,
  },
  fat: {
    // En déficit lo que hay que defender es la fuerza: mismos básicos y
    // descansos de verdad. El gasto lo pone el cardio del final, no acortar
    // los descansos entre series.
    compound: { sets: 3, reps: 8, restSec: 120 },
    accessory: { sets: 3, reps: 12, restSec: 60 },
    cardioMin: 15,
    workSec: 45,
    holdSec: 40,
  },
  performance: {
    compound: { sets: 4, reps: 10, restSec: 90 },
    accessory: { sets: 3, reps: 12, restSec: 60 },
    cardioMin: 10,
    workSec: 45,
    holdSec: 60,
  },
};

type Focus = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full';

const FOCUS_LABEL: Record<Focus, string> = {
  push: 'Empuje',
  pull: 'Tirón',
  legs: 'Pierna',
  upper: 'Torso',
  lower: 'Pierna',
  full: 'Cuerpo completo',
};

/**
 * Reparto semanal. Con pocos días conviene tocar todo el cuerpo cada sesión;
 * a partir de tres ya compensa dividir por patrón para meter más volumen sin
 * alargar los entrenos.
 */
const SPLITS: Record<number, Focus[]> = {
  1: ['full'],
  2: ['full', 'full'],
  3: ['push', 'pull', 'legs'],
  4: ['upper', 'lower', 'upper', 'lower'],
  5: ['push', 'pull', 'legs', 'upper', 'lower'],
  6: ['push', 'pull', 'legs', 'push', 'pull', 'legs'],
};

interface Slot {
  pattern: Pattern;
  tier: Tier;
}

const slot = (pattern: Pattern, tier: Tier): Slot => ({ pattern, tier });

/** Qué se intenta meter en cada sesión, en orden: primero lo pesado. */
const TEMPLATES: Record<Focus, Slot[]> = {
  push: [
    slot('push', 'compound'),
    slot('push', 'compound'),
    // Tres básicos de empuje: hay de sobra (banca, militar, fondos, Arnold) y
    // ahí es donde está el trabajo que cuenta.
    slot('push', 'compound'),
    slot('push', 'accessory'),
    slot('core', 'accessory'),
  ],
  pull: [
    slot('pull', 'compound'),
    slot('pull', 'compound'),
    slot('pull', 'accessory'),
    slot('pull', 'accessory'),
    slot('core', 'accessory'),
  ],
  legs: [
    slot('legs', 'compound'),
    slot('legs', 'compound'),
    slot('legs', 'accessory'),
    slot('legs', 'accessory'),
    slot('core', 'accessory'),
  ],
  upper: [
    slot('push', 'compound'),
    slot('pull', 'compound'),
    slot('push', 'compound'),
    slot('pull', 'compound'),
    slot('push', 'accessory'),
    slot('pull', 'accessory'),
  ],
  lower: [
    slot('legs', 'compound'),
    slot('legs', 'compound'),
    slot('legs', 'accessory'),
    slot('legs', 'accessory'),
    slot('core', 'accessory'),
  ],
  full: [
    slot('legs', 'compound'),
    slot('push', 'compound'),
    slot('pull', 'compound'),
    slot('legs', 'accessory'),
    slot('push', 'accessory'),
    slot('pull', 'accessory'),
    slot('core', 'accessory'),
  ],
};

/**
 * Cuando la plantilla se queda corta —normalmente por falta de material— se
 * sigue rellenando por estos patrones hasta agotar el tiempo disponible.
 */
const FILLERS: Record<Focus, Pattern[]> = {
  push: ['push', 'core'],
  pull: ['pull', 'core'],
  legs: ['legs', 'core'],
  upper: ['push', 'pull', 'core'],
  lower: ['legs', 'core'],
  full: ['legs', 'push', 'pull', 'core'],
};

/**
 * Los básicos de toda la vida. A igualdad de condiciones entran antes que sus
 * variantes: sin esto, un plan de fuerza podía quedarse sin peso muerto solo
 * porque en el catálogo va detrás de los remos.
 *
 * El rumano está aquí por lo que evita: sin él, el desempate metía la
 * sentadilla frontal como segundo básico de pierna, y es de las peores cosas
 * que se le pueden mandar a alguien que todavía no domina la sentadilla.
 */
const PRIORITY = new Set([
  'seed-0', // Press banca
  'seed-6', // Dominadas
  'seed-8', // Remo con barra
  'seed-11', // Peso muerto
  'seed-13', // Sentadilla
  'seed-16', // Peso muerto rumano
  'seed-22', // Press militar
]);

/** Calentamiento y transiciones que no aparecen como ejercicio pero ocupan. */
const WARMUP_SEC = 300;
const TRANSITION_SEC = 60;
/** Por corto que sea el hueco, una sesión de menos de esto no vale la pena. */
const MIN_ITEMS = 3;
/** Más de esto ya no es una sesión, es una mudanza. */
const MAX_ITEMS = 8;

function metaFor(exercise: Exercise): { pattern: Pattern; tier: Tier } {
  const seed = SEED_META[exercise.id];
  if (seed) return seed;

  // Ejercicio propio del usuario: lo deducimos del tipo y del grupo muscular.
  return {
    pattern: exercise.kind === 'cardio' ? 'cardio' : (GROUP_PATTERN[exercise.group] ?? 'core'),
    tier: 'accessory',
  };
}

/** Lo mínimo que hay que saber de una línea para cronometrarla. */
export interface TimedItem {
  sets: number;
  durationSec?: number | null;
  restSec: number;
}

/**
 * Segundos por serie cuando el ejercicio no dice cuánto dura. Es lo que tardan
 * las series de hipertrofia, y sirve de referencia para estimar cualquier
 * rutina escrita a mano.
 */
export const REFERENCE_WORK_SEC = 45;

function itemSeconds(item: TimedItem, workSec: number): number {
  const work = item.durationSec ?? workSec;
  // El descanso de la última serie no cuenta: ya has terminado.
  return item.sets * work + Math.max(0, item.sets - 1) * item.restSec + TRANSITION_SEC;
}

/**
 * Minutos que se va a llevar una sesión: trabajo, descansos, el cambio de un
 * ejercicio a otro y el calentamiento. Lo usan el plan generado y el catálogo
 * de rutinas, para que el mismo entreno no salga con dos duraciones distintas.
 */
export function estimateMinutes(items: TimedItem[], workSec = REFERENCE_WORK_SEC): number {
  const total = items.reduce((acc, item) => acc + itemSeconds(item, workSec), WARMUP_SEC);
  return Math.round(total / 60);
}

/** Construye la línea del plan a partir del ejercicio y la dosis del objetivo. */
function planItem(exercise: Exercise, dose: Dose, holdSec: number): PlannedItem {
  const isHold = exercise.kind === 'time';
  return {
    exerciseId: exercise.id,
    name: exercise.name,
    kind: exercise.kind,
    sets: dose.sets,
    reps: isHold ? null : dose.reps,
    durationSec: isHold ? holdSec : null,
    restSec: dose.restSec,
  };
}

/**
 * Genera el plan semanal. Es una función pura: con las mismas respuestas
 * devuelve siempre las mismas rutinas, así que volver a abrir la pantalla no
 * baraja los ejercicios.
 */
export function buildPlan(profile: TrainingProfile, catalog: Exercise[]): Plan {
  const rx = PRESCRIPTION[profile.goal];
  const available = catalog.filter((e) => canDoWith(e, profile.equipment));

  // Cuántas veces se ha usado cada ejercicio: al elegir preferimos el menos
  // repetido, y así los días de un mismo patrón no salen calcados.
  const uses = new Map<string, number>();

  const candidates = (pattern: Pattern, tier: Tier, exclude: Set<string>) =>
    available
      .filter((e) => !exclude.has(e.id))
      .filter((e) => {
        const meta = metaFor(e);
        return meta.pattern === pattern && meta.tier === tier;
      })
      // Primero lo menos repetido, y a igualdad, los básicos.
      .sort(
        (a, b) =>
          (uses.get(a.id) ?? 0) - (uses.get(b.id) ?? 0) ||
          Number(PRIORITY.has(b.id)) - Number(PRIORITY.has(a.id)),
      );

  /**
   * Solo cuenta lo que acaba en la sesión. Si contáramos también los
   * candidatos descartados por falta de tiempo, el desempate se ensuciaría y
   * dos días seguidos saldrían con los mismos ejercicios.
   */
  const markUsed = (e: Exercise) => uses.set(e.id, (uses.get(e.id) ?? 0) + 1);

  const pick = (pattern: Pattern, tier: Tier, exclude: Set<string>): Exercise | undefined => {
    // Si no hay nada del nivel pedido, vale uno del otro: mejor un accesorio
    // que dejar el patrón sin trabajar.
    const other: Tier = tier === 'compound' ? 'accessory' : 'compound';
    return candidates(pattern, tier, exclude)[0] ?? candidates(pattern, other, exclude)[0];
  };

  /**
   * Para el remate de cardio solo valen los ejercicios que se registran por
   * distancia y tiempo. Los de tipo tiempo (comba, burpees) irían en una sola
   * serie de diez minutos largos, que no es forma de mandar burpees.
   */
  const pickCardio = (): Exercise | undefined =>
    available
      .filter((e) => e.kind === 'cardio')
      .sort((a, b) => (uses.get(a.id) ?? 0) - (uses.get(b.id) ?? 0))[0];

  const split: Focus[] =
    profile.experience === 'beginner' && profile.daysPerWeek <= 3
      ? Array.from({ length: profile.daysPerWeek }, () => 'full')
      : (SPLITS[profile.daysPerWeek] ?? SPLITS[3]);
  const budgetSec = profile.minutesPerSession * 60;

  // El cardio nunca se come más de un cuarto de la sesión: si solo tienes 30
  // minutos, 12 de cardio dejarían el trabajo de fuerza en nada. Se redondea a
  // minutos enteros porque "11:15 caminando" no se lo cree nadie.
  const cardioSec =
    rx.cardioMin > 0
      ? Math.max(300, Math.floor(Math.min(rx.cardioMin * 60, budgetSec * 0.25) / 60) * 60)
      : 0;

  const seen = split.map((f) => f);
  const repeated = new Set(seen.filter((f, i) => seen.indexOf(f) !== i));
  const letters = new Map<Focus, number>();

  const days: PlanDay[] = split.map((focus, index) => {
    const exclude = new Set<string>();
    const items: PlannedItem[] = [];
    let used = WARMUP_SEC;

    const cardio = cardioSec > 0 ? pickCardio() : undefined;
    const reserved = cardio ? cardioSec + TRANSITION_SEC : 0;

    /** Intenta meter un ejercicio; devuelve false si ya no cabe o no hay. */
    const add = (pattern: Pattern, tier: Tier): boolean | 'empty' => {
      if (profile.experience === 'beginner' && items.length >= 5) return false;
      const exercise = pick(pattern, tier, exclude);
      if (!exercise) return 'empty';
      if (
        pattern === 'core' &&
        items.some((item) => SEED_META[item.exerciseId]?.pattern === 'core')
      )
        return 'empty';

      // La dosis la manda el ejercicio, no el hueco: si en un hueco de básico
      // acaba entrando un accesorio (unos gemelos, por ejemplo), no tiene
      // sentido mandarle 4×8 con dos minutos de descanso.
      const dose = metaFor(exercise).tier === 'compound' ? rx.compound : rx.accessory;
      const item = planItem(exercise, dose, rx.holdSec);
      const cost = itemSeconds(item, rx.workSec);

      // Siempre entran los primeros para que la sesión tenga sentido; a partir
      // de ahí, solo lo que quepa en el tiempo que hay.
      if (items.length >= MIN_ITEMS && used + cost + reserved > budgetSec) return false;

      exclude.add(exercise.id);
      markUsed(exercise);
      items.push(item);
      used += cost;
      return true;
    };

    for (const s of TEMPLATES[focus]) {
      if (add(s.pattern, s.tier) === false) break;
    }

    // Si la plantilla se ha quedado corta (poco material) seguimos rellenando
    // con accesorios hasta gastar el tiempo que el usuario dijo tener.
    const fillers = FILLERS[focus];
    let misses = 0;
    for (
      let i = 0;
      items.length < (profile.experience === 'beginner' ? 5 : MAX_ITEMS) && misses < fillers.length;
      i += 1
    ) {
      const result = add(fillers[i % fillers.length], 'accessory');
      if (result === false) break;
      misses = result === 'empty' ? misses + 1 : 0;
    }

    if (cardio) {
      markUsed(cardio);
      items.push({
        exerciseId: cardio.id,
        name: cardio.name,
        kind: cardio.kind,
        sets: 1,
        reps: null,
        durationSec: cardioSec,
        restSec: 0,
      });
      used += reserved;
    }

    const label = FOCUS_LABEL[focus];
    let name = label;
    if (repeated.has(focus)) {
      const n = letters.get(focus) ?? 0;
      letters.set(focus, n + 1);
      name = `${label} ${String.fromCharCode(65 + n)}`;
    }

    return {
      key: `${focus}-${index}`,
      name,
      focus: label,
      items,
      minutes: Math.round(used / 60),
    };
  });

  return { days, warnings: warningsFor(profile, available, days) };
}

function warningsFor(profile: TrainingProfile, available: Exercise[], days: PlanDay[]): string[] {
  const warnings: string[] = [];
  const has = (pattern: Pattern) =>
    available.some((e) => metaFor(e).pattern === pattern && e.kind !== 'cardio');

  if (!has('pull')) {
    warnings.push(
      'No hay con qué entrenar espalda: sin barra de dominadas, mancuernas ni poleas no se puede tirar de nada. Es el hueco más grande del plan.',
    );
  }

  if (profile.equipment.length === 0) {
    warnings.push(
      'Solo con peso corporal el plan se queda corto en pierna y espalda. Unas mancuernas o una barra de dominadas cambian mucho las opciones.',
    );
  }

  // Caminar no necesita nada, así que siempre hay algo de cardio; el aviso es
  // por quedarse solo con eso cuando el objetivo pide gastar de verdad.
  const realCardio =
    profile.equipment.includes('cardioMachine') || profile.equipment.includes('outdoors');
  if (PRESCRIPTION[profile.goal].cardioMin > 0 && !realCardio) {
    warnings.push(
      `Para ${GOAL_LABEL[profile.goal].toLowerCase()} el plan remata con cardio, pero sin marcar máquinas ni sitio para correr solo puedo mandarte a caminar. Marca alguna de las dos si puedes.`,
    );
  }

  const short = days.filter((d) => d.items.length < 4);
  if (short.length === days.length && profile.minutesPerSession <= 30) {
    warnings.push(
      'Con 30 minutos por sesión solo entran los básicos. Si algún día tienes más tiempo, añade un accesorio a mano.',
    );
  }

  return warnings;
}

/** Convierte un día del plan en una rutina guardable. */
export function planDayToRoutine(day: PlanDay, profile: TrainingProfile, name: string): Routine {
  const now = new Date().toISOString();
  const items: PlanItem[] = day.items.map((item) => ({
    id: uid('pi-'),
    exerciseId: item.exerciseId,
    sets: item.sets,
    reps: item.reps,
    durationSec: item.durationSec,
    restSec: item.restSec,
  }));

  return {
    id: uid('rt-'),
    name,
    notes: `${GOAL_LABEL[profile.goal]} · plan de ${profile.daysPerWeek} días · ${profile.minutesPerSession} min`,
    items,
    createdAt: now,
    updatedAt: now,
  };
}

/** Añade " (2)", " (3)"… si ya existe una rutina con ese nombre. */
export function uniqueName(name: string, taken: string[]): string {
  if (!taken.includes(name)) return name;
  let n = 2;
  while (taken.includes(`${name} (${n})`)) n += 1;
  return `${name} (${n})`;
}
