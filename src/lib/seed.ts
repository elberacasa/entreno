import type { Equipment, Exercise } from '@/lib/types';

/**
 * Patrón de movimiento. Es lo que permite montar un reparto coherente
 * (empuje / tirón / pierna) en vez de repartir por grupo muscular a ojo:
 * "Curl con barra" y "Press francés" son los dos «Brazo», pero uno tira y el
 * otro empuja.
 */
export type Pattern = 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'mobility';

/**
 * Los básicos mueven mucho peso y varias articulaciones: van primero en la
 * sesión. Los accesorios rematan.
 */
export type Tier = 'compound' | 'accessory';

type SeedRow = [
  name: string,
  group: string,
  kind: Exercise['kind'],
  equipment: Equipment[],
  pattern: Pattern,
  tier: Tier,
];

/**
 * Catálogo inicial. Se copia a almacenamiento la primera vez que se abre la
 * app; a partir de ahí el usuario puede añadir, renombrar o borrar ejercicios.
 *
 * El orden importa: el identificador de cada uno es su posición (`seed-3`), y
 * las rutinas y los entrenos ya guardados apuntan a esos identificadores. Se
 * pueden añadir filas al final, nunca reordenar ni quitar de en medio.
 */
const ROWS: SeedRow[] = [
  // Pecho
  ['Press banca', 'Pecho', 'strength', ['barbell', 'bench'], 'push', 'compound'],
  [
    'Press inclinado con mancuernas',
    'Pecho',
    'strength',
    ['dumbbells', 'bench'],
    'push',
    'compound',
  ],
  ['Press banca con mancuernas', 'Pecho', 'strength', ['dumbbells', 'bench'], 'push', 'compound'],
  ['Aperturas en polea', 'Pecho', 'strength', ['machines'], 'push', 'accessory'],
  ['Fondos en paralelas', 'Pecho', 'strength', ['pullupBar'], 'push', 'compound'],
  ['Flexiones', 'Pecho', 'strength', [], 'push', 'compound'],

  // Espalda
  ['Dominadas', 'Espalda', 'strength', ['pullupBar'], 'pull', 'compound'],
  ['Jalón al pecho', 'Espalda', 'strength', ['machines'], 'pull', 'compound'],
  ['Remo con barra', 'Espalda', 'strength', ['barbell'], 'pull', 'compound'],
  ['Remo con mancuerna', 'Espalda', 'strength', ['dumbbells'], 'pull', 'compound'],
  ['Remo en polea baja', 'Espalda', 'strength', ['machines'], 'pull', 'compound'],
  ['Peso muerto', 'Espalda', 'strength', ['barbell'], 'pull', 'compound'],
  ['Face pull', 'Espalda', 'strength', ['machines'], 'pull', 'accessory'],

  // Pierna
  ['Sentadilla', 'Pierna', 'strength', ['barbell'], 'legs', 'compound'],
  ['Sentadilla frontal', 'Pierna', 'strength', ['barbell'], 'legs', 'compound'],
  ['Prensa', 'Pierna', 'strength', ['machines'], 'legs', 'compound'],
  ['Peso muerto rumano', 'Pierna', 'strength', ['barbell'], 'legs', 'compound'],
  ['Zancadas', 'Pierna', 'strength', [], 'legs', 'compound'],
  ['Extensión de cuádriceps', 'Pierna', 'strength', ['machines'], 'legs', 'accessory'],
  ['Curl femoral', 'Pierna', 'strength', ['machines'], 'legs', 'accessory'],
  ['Hip thrust', 'Pierna', 'strength', ['barbell', 'bench'], 'legs', 'compound'],
  ['Elevación de gemelos', 'Pierna', 'strength', [], 'legs', 'accessory'],

  // Hombro
  ['Press militar', 'Hombro', 'strength', ['barbell'], 'push', 'compound'],
  ['Press Arnold', 'Hombro', 'strength', ['dumbbells'], 'push', 'compound'],
  ['Elevaciones laterales', 'Hombro', 'strength', ['dumbbells'], 'push', 'accessory'],
  // Los pájaros trabajan el deltoides posterior: acompañan mejor al tirón.
  ['Pájaros', 'Hombro', 'strength', ['dumbbells'], 'pull', 'accessory'],

  // Brazo
  ['Curl con barra', 'Brazo', 'strength', ['barbell'], 'pull', 'accessory'],
  ['Curl con mancuernas', 'Brazo', 'strength', ['dumbbells'], 'pull', 'accessory'],
  ['Curl martillo', 'Brazo', 'strength', ['dumbbells'], 'pull', 'accessory'],
  ['Extensión de tríceps en polea', 'Brazo', 'strength', ['machines'], 'push', 'accessory'],
  ['Press francés', 'Brazo', 'strength', ['barbell', 'bench'], 'push', 'accessory'],

  // Core
  ['Crunch', 'Core', 'strength', [], 'core', 'accessory'],
  ['Elevación de piernas colgado', 'Core', 'strength', ['pullupBar'], 'core', 'accessory'],
  ['Rueda abdominal', 'Core', 'strength', ['abWheel'], 'core', 'accessory'],
  ['Plancha', 'Core', 'time', [], 'core', 'accessory'],
  ['Plancha lateral', 'Core', 'time', [], 'core', 'accessory'],
  ['Hollow hold', 'Core', 'time', [], 'core', 'accessory'],

  // Cardio
  ['Correr', 'Cardio', 'cardio', ['outdoors'], 'cardio', 'compound'],
  ['Cinta', 'Cardio', 'cardio', ['cardioMachine'], 'cardio', 'compound'],
  ['Bicicleta', 'Cardio', 'cardio', ['outdoors'], 'cardio', 'compound'],
  ['Bicicleta estática', 'Cardio', 'cardio', ['cardioMachine'], 'cardio', 'compound'],
  ['Remo', 'Cardio', 'cardio', ['cardioMachine'], 'cardio', 'compound'],
  ['Elíptica', 'Cardio', 'cardio', ['cardioMachine'], 'cardio', 'compound'],
  ['Caminar', 'Cardio', 'cardio', [], 'cardio', 'compound'],
  ['Comba', 'Cardio', 'time', [], 'cardio', 'compound'],

  // Movilidad
  ['Colgarse de la barra', 'Movilidad', 'time', ['pullupBar'], 'mobility', 'accessory'],
  ['Estiramiento de isquios', 'Movilidad', 'time', [], 'mobility', 'accessory'],
  ['Estiramiento de cadera', 'Movilidad', 'time', [], 'mobility', 'accessory'],
  ['Movilidad de hombro', 'Movilidad', 'time', [], 'mobility', 'accessory'],
  ['Sentadilla profunda (hold)', 'Movilidad', 'time', [], 'mobility', 'accessory'],

  // --- Añadidos con el cuestionario de rutinas ---------------------------
  // Sin estos, quien entrena en casa con mancuernas se quedaba casi sin
  // pierna: el catálogo original la cubría solo con barra y máquinas.
  ['Sentadilla goblet', 'Pierna', 'strength', ['dumbbells'], 'legs', 'compound'],
  ['Zancada búlgara', 'Pierna', 'strength', ['bench'], 'legs', 'compound'],
  ['Peso muerto rumano con mancuernas', 'Pierna', 'strength', ['dumbbells'], 'legs', 'compound'],
  ['Subidas al banco', 'Pierna', 'strength', ['bench'], 'legs', 'compound'],
  ['Puente de glúteo', 'Pierna', 'strength', [], 'legs', 'accessory'],
  ['Remo invertido', 'Espalda', 'strength', ['pullupBar'], 'pull', 'compound'],
  ['Encogimientos', 'Espalda', 'strength', ['dumbbells'], 'pull', 'accessory'],
  ['Fondos en banco', 'Brazo', 'strength', ['bench'], 'push', 'accessory'],
  ['Patada de tríceps', 'Brazo', 'strength', ['dumbbells'], 'push', 'accessory'],
  ['Mountain climbers', 'Core', 'time', [], 'core', 'accessory'],
  ['Burpees', 'Cardio', 'time', [], 'cardio', 'compound'],
];

/**
 * Tamaño del catálogo antes de que existiera el cuestionario. Sirve para saber
 * qué ejercicios son nuevos para quien ya tenía la app instalada.
 */
export const LEGACY_SEED_COUNT = 50;

export const EXERCISE_GROUPS = [
  'Pecho',
  'Espalda',
  'Pierna',
  'Hombro',
  'Brazo',
  'Core',
  'Cardio',
  'Movilidad',
  'Otro',
];

const seedId = (index: number) => `seed-${index}`;

export const SEED_COUNT = ROWS.length;

/** Catálogo inicial completo, o solo lo añadido a partir de `from`. */
export function seedExercises(from = 0): Exercise[] {
  return ROWS.slice(from).map(([name, group, kind, equipment], i) => ({
    id: seedId(from + i),
    name,
    group,
    kind,
    equipment,
  }));
}

/** Material de cada ejercicio del catálogo inicial, por identificador. */
export const SEED_EQUIPMENT: Record<string, Equipment[]> = Object.fromEntries(
  ROWS.map(([, , , equipment], i) => [seedId(i), equipment]),
);

/**
 * Patrón y nivel de cada ejercicio del catálogo, para el generador de rutinas.
 * No se guarda en el ejercicio porque solo lo usa el recomendador y no tiene
 * sentido que el usuario lo edite.
 */
export const SEED_META: Record<string, { pattern: Pattern; tier: Tier }> = Object.fromEntries(
  ROWS.map(([, , , , pattern, tier], i) => [seedId(i), { pattern, tier }]),
);

/** Patrón de reserva para ejercicios propios, deducido del grupo muscular. */
export const GROUP_PATTERN: Record<string, Pattern> = {
  Pecho: 'push',
  Hombro: 'push',
  Espalda: 'pull',
  Brazo: 'pull',
  Pierna: 'legs',
  Core: 'core',
  Cardio: 'cardio',
  Movilidad: 'mobility',
};
