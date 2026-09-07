import type { Exercise } from '@/lib/types';

type SeedRow = [name: string, group: string, kind: Exercise['kind']];

/**
 * Catálogo inicial. Se copia a almacenamiento la primera vez que se abre la
 * app; a partir de ahí el usuario puede añadir, renombrar o borrar ejercicios.
 */
const ROWS: SeedRow[] = [
  // Pecho
  ['Press banca', 'Pecho', 'strength'],
  ['Press inclinado con mancuernas', 'Pecho', 'strength'],
  ['Press banca con mancuernas', 'Pecho', 'strength'],
  ['Aperturas en polea', 'Pecho', 'strength'],
  ['Fondos en paralelas', 'Pecho', 'strength'],
  ['Flexiones', 'Pecho', 'strength'],

  // Espalda
  ['Dominadas', 'Espalda', 'strength'],
  ['Jalón al pecho', 'Espalda', 'strength'],
  ['Remo con barra', 'Espalda', 'strength'],
  ['Remo con mancuerna', 'Espalda', 'strength'],
  ['Remo en polea baja', 'Espalda', 'strength'],
  ['Peso muerto', 'Espalda', 'strength'],
  ['Face pull', 'Espalda', 'strength'],

  // Pierna
  ['Sentadilla', 'Pierna', 'strength'],
  ['Sentadilla frontal', 'Pierna', 'strength'],
  ['Prensa', 'Pierna', 'strength'],
  ['Peso muerto rumano', 'Pierna', 'strength'],
  ['Zancadas', 'Pierna', 'strength'],
  ['Extensión de cuádriceps', 'Pierna', 'strength'],
  ['Curl femoral', 'Pierna', 'strength'],
  ['Hip thrust', 'Pierna', 'strength'],
  ['Elevación de gemelos', 'Pierna', 'strength'],

  // Hombro
  ['Press militar', 'Hombro', 'strength'],
  ['Press Arnold', 'Hombro', 'strength'],
  ['Elevaciones laterales', 'Hombro', 'strength'],
  ['Pájaros', 'Hombro', 'strength'],

  // Brazo
  ['Curl con barra', 'Brazo', 'strength'],
  ['Curl con mancuernas', 'Brazo', 'strength'],
  ['Curl martillo', 'Brazo', 'strength'],
  ['Extensión de tríceps en polea', 'Brazo', 'strength'],
  ['Press francés', 'Brazo', 'strength'],

  // Core
  ['Crunch', 'Core', 'strength'],
  ['Elevación de piernas colgado', 'Core', 'strength'],
  ['Rueda abdominal', 'Core', 'strength'],
  ['Plancha', 'Core', 'time'],
  ['Plancha lateral', 'Core', 'time'],
  ['Hollow hold', 'Core', 'time'],

  // Cardio
  ['Correr', 'Cardio', 'cardio'],
  ['Cinta', 'Cardio', 'cardio'],
  ['Bicicleta', 'Cardio', 'cardio'],
  ['Bicicleta estática', 'Cardio', 'cardio'],
  ['Remo', 'Cardio', 'cardio'],
  ['Elíptica', 'Cardio', 'cardio'],
  ['Caminar', 'Cardio', 'cardio'],
  ['Comba', 'Cardio', 'time'],

  // Movilidad
  ['Colgarse de la barra', 'Movilidad', 'time'],
  ['Estiramiento de isquios', 'Movilidad', 'time'],
  ['Estiramiento de cadera', 'Movilidad', 'time'],
  ['Movilidad de hombro', 'Movilidad', 'time'],
  ['Sentadilla profunda (hold)', 'Movilidad', 'time'],
];

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

export function seedExercises(): Exercise[] {
  return ROWS.map(([name, group, kind], i) => ({
    id: `seed-${i}`,
    name,
    group,
    kind,
  }));
}
