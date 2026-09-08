import { estimateMinutes } from '@/lib/recommend';
import { SEED_EQUIPMENT } from '@/lib/seed';
import { EQUIPMENT_ORDER, type Equipment } from '@/lib/types';

/**
 * Catálogo fijo de rutinas ya montadas, para quien no quiere contestar el
 * cuestionario ni armarse una a mano: eliges nivel y zona, la miras y la
 * copias a tus rutinas.
 *
 * Es una lista escrita a mano a propósito. El generador (`recommend.ts`) parte
 * de tus respuestas y cambia con ellas; esto está siempre igual y siempre
 * disponible.
 */

export type Level = 'easy' | 'medium' | 'hard';

export const LEVEL_LABEL: Record<Level, string> = {
  easy: 'Fácil',
  medium: 'Media',
  hard: 'Difícil',
};

export const LEVEL_ORDER: Level[] = ['easy', 'medium', 'hard'];

export type Zone = 'push' | 'pull' | 'legs' | 'core' | 'arms' | 'upper' | 'lower';

export const ZONE_LABEL: Record<Zone, string> = {
  push: 'Empuje',
  pull: 'Tirón',
  legs: 'Piernas',
  core: 'Core',
  arms: 'Brazos',
  upper: 'Tren superior',
  lower: 'Tren inferior',
};

export const ZONE_ORDER: Zone[] = ['push', 'pull', 'legs', 'core', 'arms', 'upper', 'lower'];

export interface CatalogItem {
  /** Identificador del catálogo inicial, `seed-N`. */
  exerciseId: string;
  sets: number;
  /** Repeticiones por serie; los ejercicios de tiempo no las usan. */
  reps?: number;
  /** Duración de cada serie en los ejercicios de tiempo (planchas, hollow). */
  durationSec?: number;
  restSec: number;
}

export interface CatalogRoutine {
  id: string;
  name: string;
  level: Level;
  zone: Zone;
  /** Una línea: qué es y para quién. Sin postureo. */
  summary: string;
  items: CatalogItem[];
}

/**
 * El número es la **posición** del ejercicio en `seed.ts`, que es de donde
 * sale su identificador. No se deduce por el nombre: si algún día se añaden
 * ejercicios, se añaden al final y estos números siguen valiendo.
 */
const reps = (seed: number, sets: number, count: number, restSec: number): CatalogItem => ({
  exerciseId: `seed-${seed}`,
  sets,
  reps: count,
  restSec,
});

/** Igual, pero para los ejercicios que se miden en segundos aguantando. */
const hold = (seed: number, sets: number, durationSec: number, restSec: number): CatalogItem => ({
  exerciseId: `seed-${seed}`,
  sets,
  durationSec,
  restSec,
});

/**
 * Una rutina por cada par nivel × zona: 21 en total. Así ningún filtro se
 * queda sin resultados. Si se añaden más, hay que mantener esa garantía.
 */
export const CATALOG_ROUTINES: CatalogRoutine[] = [
  // --- Empuje -----------------------------------------------------------
  {
    id: 'cat-push-easy',
    name: 'Empuje fácil',
    level: 'easy',
    zone: 'push',
    summary: 'Pecho, hombro y tríceps con mancuernas y un banco, sin barra de por medio.',
    items: [
      reps(5, 3, 10, 90), // Flexiones
      reps(2, 3, 12, 90), // Press banca con mancuernas
      reps(24, 3, 15, 60), // Elevaciones laterales
      reps(57, 3, 10, 60), // Fondos en banco
    ],
  },
  {
    id: 'cat-push-medium',
    name: 'Empuje medio',
    level: 'medium',
    zone: 'push',
    summary: 'Banca y militar de base, y hombro, tríceps y core de remate.',
    items: [
      reps(0, 4, 8, 120), // Press banca
      reps(22, 4, 8, 120), // Press militar
      reps(1, 3, 10, 90), // Press inclinado con mancuernas
      reps(24, 3, 15, 60), // Elevaciones laterales
      reps(30, 3, 12, 75), // Press francés
      hold(34, 3, 45, 45), // Plancha
    ],
  },
  {
    id: 'cat-push-hard',
    name: 'Empuje duro',
    level: 'hard',
    zone: 'push',
    summary: 'Dos básicos a series bajas y cinco accesorios detrás: el día largo de empuje.',
    items: [
      reps(0, 5, 5, 180), // Press banca
      reps(22, 4, 6, 150), // Press militar
      reps(4, 4, 8, 120), // Fondos en paralelas
      reps(23, 3, 10, 90), // Press Arnold
      reps(24, 4, 15, 60), // Elevaciones laterales
      reps(29, 4, 12, 60), // Extensión de tríceps en polea
      reps(33, 3, 10, 60), // Rueda abdominal
    ],
  },

  // --- Tirón ------------------------------------------------------------
  {
    id: 'cat-pull-easy',
    name: 'Tirón fácil',
    level: 'easy',
    zone: 'pull',
    summary: 'Espalda en polea y máquina, que perdonan la técnica mientras coges soltura.',
    items: [
      reps(7, 3, 12, 90), // Jalón al pecho
      reps(10, 3, 12, 90), // Remo en polea baja
      reps(12, 3, 15, 60), // Face pull
      reps(27, 3, 12, 60), // Curl con mancuernas
    ],
  },
  {
    id: 'cat-pull-medium',
    name: 'Tirón medio',
    level: 'medium',
    zone: 'pull',
    summary: 'Dominadas y remo con barra, con jalón, hombro posterior y bíceps detrás.',
    items: [
      reps(6, 4, 6, 120), // Dominadas
      reps(8, 4, 8, 120), // Remo con barra
      reps(7, 3, 10, 90), // Jalón al pecho
      reps(12, 3, 15, 60), // Face pull
      reps(26, 3, 12, 60), // Curl con barra
    ],
  },
  {
    id: 'cat-pull-hard',
    name: 'Tirón duro',
    level: 'hard',
    zone: 'pull',
    summary: 'Peso muerto de entrada y todo el tirón encima. Pide el día entero.',
    items: [
      reps(11, 5, 5, 180), // Peso muerto
      reps(6, 4, 8, 150), // Dominadas
      reps(8, 4, 8, 120), // Remo con barra
      reps(9, 3, 10, 90), // Remo con mancuerna
      reps(12, 4, 15, 60), // Face pull
      reps(28, 3, 12, 60), // Curl martillo
      reps(32, 3, 12, 60), // Elevación de piernas colgado
    ],
  },

  // --- Piernas ----------------------------------------------------------
  {
    id: 'cat-legs-easy',
    name: 'Piernas fácil',
    level: 'easy',
    zone: 'legs',
    summary: 'Pierna entera sin cargarte una barra a la espalda.',
    items: [
      reps(50, 3, 12, 90), // Sentadilla goblet
      reps(15, 3, 12, 90), // Prensa
      reps(19, 3, 12, 75), // Curl femoral
      reps(54, 3, 15, 60), // Puente de glúteo
      reps(21, 3, 15, 45), // Elevación de gemelos
    ],
  },
  {
    id: 'cat-legs-medium',
    name: 'Piernas medio',
    level: 'medium',
    zone: 'legs',
    summary: 'Sentadilla y rumano de base, y cuádriceps, femoral y gemelo para rematar.',
    items: [
      reps(13, 4, 8, 150), // Sentadilla
      reps(16, 3, 10, 120), // Peso muerto rumano
      reps(17, 3, 12, 90), // Zancadas
      reps(18, 3, 12, 75), // Extensión de cuádriceps
      reps(19, 3, 12, 75), // Curl femoral
      reps(21, 3, 15, 45), // Elevación de gemelos
    ],
  },
  {
    id: 'cat-legs-hard',
    name: 'Piernas duro',
    level: 'hard',
    zone: 'legs',
    summary: 'Dos sentadillas, rumano pesado y trabajo a una pierna. Mañana bajas las escaleras de lado.',
    items: [
      reps(13, 5, 5, 180), // Sentadilla
      reps(14, 4, 6, 150), // Sentadilla frontal
      reps(16, 4, 8, 120), // Peso muerto rumano
      reps(51, 3, 10, 90), // Zancada búlgara
      reps(20, 4, 10, 90), // Hip thrust
      reps(19, 3, 12, 75), // Curl femoral
      reps(21, 4, 15, 45), // Elevación de gemelos
    ],
  },

  // --- Core -------------------------------------------------------------
  {
    id: 'cat-core-easy',
    name: 'Core fácil',
    level: 'easy',
    zone: 'core',
    summary: 'Cuatro ejercicios de suelo, sin material. Sirve para un día sin gimnasio.',
    items: [
      hold(34, 3, 30, 45), // Plancha
      reps(31, 3, 15, 45), // Crunch
      reps(54, 3, 15, 45), // Puente de glúteo
      hold(35, 3, 20, 45), // Plancha lateral
    ],
  },
  {
    id: 'cat-core-medium',
    name: 'Core medio',
    level: 'medium',
    zone: 'core',
    summary: 'Isométricos largos y rueda: aguantar la postura, no contar repeticiones.',
    items: [
      hold(34, 3, 45, 45), // Plancha
      hold(36, 3, 30, 45), // Hollow hold
      reps(33, 3, 10, 60), // Rueda abdominal
      hold(59, 3, 40, 45), // Mountain climbers
      hold(35, 3, 30, 45), // Plancha lateral
    ],
  },
  {
    id: 'cat-core-hard',
    name: 'Core duro',
    level: 'hard',
    zone: 'core',
    summary: 'Rueda de entrada y todo lo demás en el suelo. Sin material y el más exigente de los tres.',
    items: [
      // La rueda va en fresco: es donde antes se pierde la postura, y es lo
      // único sin material que llega a la tensión que daba el colgado.
      reps(33, 4, 10, 75), // Rueda abdominal
      hold(36, 4, 45, 45), // Hollow hold
      hold(35, 4, 40, 45), // Plancha lateral
      hold(34, 3, 60, 45), // Plancha
      hold(59, 4, 45, 45), // Mountain climbers
      reps(31, 3, 20, 45), // Crunch
    ],
  },

  // --- Brazos -----------------------------------------------------------
  {
    id: 'cat-arms-easy',
    name: 'Brazos fácil',
    level: 'easy',
    zone: 'arms',
    summary: 'Bíceps y tríceps alternos con mancuernas y un banco. Nada más.',
    items: [
      reps(27, 3, 12, 60), // Curl con mancuernas
      reps(58, 3, 12, 60), // Patada de tríceps
      reps(28, 3, 12, 60), // Curl martillo
      reps(57, 3, 10, 60), // Fondos en banco
    ],
  },
  {
    id: 'cat-arms-medium',
    name: 'Brazos medio',
    level: 'medium',
    zone: 'arms',
    summary: 'Barra para lo pesado, mancuerna y polea para el volumen, y trapecio al final.',
    items: [
      reps(26, 4, 10, 75), // Curl con barra
      reps(30, 4, 10, 75), // Press francés
      reps(28, 3, 12, 60), // Curl martillo
      reps(29, 3, 15, 60), // Extensión de tríceps en polea
      reps(56, 3, 15, 60), // Encogimientos
    ],
  },
  {
    id: 'cat-arms-hard',
    name: 'Brazos duro',
    level: 'hard',
    zone: 'arms',
    summary: 'Empieza con dominadas y fondos, que mueven más brazo que cualquier curl, y aísla después.',
    items: [
      reps(6, 4, 8, 120), // Dominadas
      reps(4, 4, 10, 120), // Fondos en paralelas
      reps(26, 4, 10, 75), // Curl con barra
      reps(30, 4, 10, 75), // Press francés
      reps(28, 4, 12, 60), // Curl martillo
      reps(29, 4, 15, 60), // Extensión de tríceps en polea
    ],
  },

  // --- Tren superior ----------------------------------------------------
  {
    id: 'cat-upper-easy',
    name: 'Torso fácil',
    level: 'easy',
    zone: 'upper',
    summary: 'Empuje y tirón en la misma sesión, con mancuernas y polea.',
    items: [
      reps(5, 3, 10, 90), // Flexiones
      reps(7, 3, 12, 90), // Jalón al pecho
      reps(2, 3, 12, 90), // Press banca con mancuernas
      reps(9, 3, 12, 90), // Remo con mancuerna
      reps(24, 3, 15, 60), // Elevaciones laterales
    ],
  },
  {
    id: 'cat-upper-medium',
    name: 'Torso medio',
    level: 'medium',
    zone: 'upper',
    summary: 'Banca y remo pesados, hombro y jalón después, brazo al final.',
    items: [
      reps(0, 4, 8, 120), // Press banca
      reps(8, 4, 8, 120), // Remo con barra
      reps(22, 3, 10, 90), // Press militar
      reps(7, 3, 10, 90), // Jalón al pecho
      reps(26, 3, 12, 60), // Curl con barra
      reps(30, 3, 12, 60), // Press francés
    ],
  },
  {
    id: 'cat-upper-hard',
    name: 'Torso duro',
    level: 'hard',
    zone: 'upper',
    summary: 'Los cuatro grandes del torso y cuatro accesorios. Cuenta con hora y media de gimnasio.',
    items: [
      reps(0, 5, 5, 180), // Press banca
      reps(6, 4, 8, 150), // Dominadas
      reps(22, 4, 6, 150), // Press militar
      reps(8, 4, 8, 120), // Remo con barra
      reps(1, 3, 10, 90), // Press inclinado con mancuernas
      reps(12, 4, 15, 60), // Face pull
      reps(28, 3, 12, 60), // Curl martillo
      reps(33, 3, 10, 60), // Rueda abdominal
    ],
  },

  // --- Tren inferior ----------------------------------------------------
  {
    id: 'cat-lower-easy',
    name: 'Pierna fácil',
    level: 'easy',
    zone: 'lower',
    summary: 'Pierna y glúteo apoyándote en el banco y en tu propio peso.',
    items: [
      reps(50, 3, 12, 90), // Sentadilla goblet
      reps(53, 3, 12, 75), // Subidas al banco
      reps(54, 3, 15, 60), // Puente de glúteo
      reps(19, 3, 12, 75), // Curl femoral
      reps(21, 3, 15, 45), // Elevación de gemelos
    ],
  },
  {
    id: 'cat-lower-medium',
    name: 'Pierna medio',
    level: 'medium',
    zone: 'lower',
    summary: 'Sentadilla y rumano de base, con prensa, glúteo, gemelo y una plancha de cierre.',
    items: [
      reps(13, 4, 8, 150), // Sentadilla
      reps(16, 4, 10, 120), // Peso muerto rumano
      reps(15, 3, 12, 90), // Prensa
      reps(20, 3, 12, 90), // Hip thrust
      reps(21, 3, 15, 45), // Elevación de gemelos
      hold(34, 3, 45, 45), // Plancha
    ],
  },
  {
    id: 'cat-lower-hard',
    name: 'Pierna duro',
    level: 'hard',
    zone: 'lower',
    summary: 'Peso muerto y sentadilla el mismo día, y todavía queda glúteo y unilateral.',
    items: [
      reps(11, 5, 5, 180), // Peso muerto
      reps(13, 5, 5, 180), // Sentadilla
      reps(51, 4, 10, 90), // Zancada búlgara
      reps(20, 4, 10, 90), // Hip thrust
      reps(19, 4, 12, 75), // Curl femoral
      reps(21, 4, 20, 45), // Elevación de gemelos
      reps(32, 3, 12, 60), // Elevación de piernas colgado
    ],
  },
];

/**
 * Material que pide una rutina: la unión de lo que necesita cada ejercicio.
 * Se deriva a propósito, para que no pueda mentir si algún día cambia el
 * material de un ejercicio del catálogo inicial.
 */
export function catalogEquipment(routine: CatalogRoutine): Equipment[] {
  const needed = new Set<Equipment>();
  for (const item of routine.items) {
    for (const e of SEED_EQUIPMENT[item.exerciseId] ?? []) needed.add(e);
  }
  // En el orden de siempre, no en el de aparición: así la misma lista se lee
  // igual en todas las rutinas.
  return EQUIPMENT_ORDER.filter((e) => needed.has(e));
}

/** Lo que pide la rutina y el usuario no marcó en el cuestionario. */
export function missingEquipment(routine: CatalogRoutine, available: Equipment[]): Equipment[] {
  return catalogEquipment(routine).filter((e) => !available.includes(e));
}

/** Minutos estimados, con el mismo cálculo que el plan recomendado. */
export function catalogMinutes(routine: CatalogRoutine): number {
  return estimateMinutes(routine.items);
}
