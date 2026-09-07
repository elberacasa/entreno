/**
 * Descarga las demostraciones de los ejercicios y las deja listas para la app.
 *
 *   node scripts/fetch-exercise-images.mjs
 *
 * Las imágenes salen de free-exercise-db (dominio público, licencia Unlicense):
 * https://github.com/yuhonas/free-exercise-db
 *
 * Cada ejercicio trae dos fotos, la posición inicial y la final. La app las
 * alterna, que es exactamente lo que enseña un gif de técnica, pero pesando
 * una fracción: un gif de estos ronda el megabyte y aquí cada fotograma se
 * queda en unos 25 KB.
 *
 * Se guardan en `assets/exercises/` para que pasen por el empaquetador: así
 * llevan hash en el nombre, funcionan también en la app nativa y el service
 * worker las cachea como cualquier otro estático.
 *
 * Solo hay que volver a ejecutarlo si se añaden ejercicios al catálogo.
 */
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets', 'exercises');
const GENERATED = join(ROOT, 'src', 'lib', 'demos.ts');

const DB = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGES = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

/** Ancho al que se reescalan. Más que esto no aporta en un móvil. */
const WIDTH = 480;
const QUALITY = 72;

/**
 * Qué ejercicio de la base corresponde a cada uno del catálogo, por posición.
 * Se referencian por nombre exacto y el script falla si alguno no aparece:
 * un identificador mal escrito daría un 404 silencioso.
 *
 * Los que faltan (hollow hold, colgarse de la barra, burpees) no están en la
 * base. Se quedan sin demostración a propósito: enseñar la foto de otro
 * ejercicio es peor que no enseñar ninguna.
 */
const MAPPING = {
  0: 'Barbell Bench Press - Medium Grip',
  1: 'Incline Dumbbell Press',
  2: 'Dumbbell Bench Press',
  3: 'Cable Crossover',
  4: 'Dips - Chest Version',
  5: 'Pushups',
  6: 'Pullups',
  7: 'Wide-Grip Lat Pulldown',
  8: 'Bent Over Barbell Row',
  9: 'One-Arm Dumbbell Row',
  10: 'Seated Cable Rows',
  11: 'Barbell Deadlift',
  12: 'Face Pull',
  13: 'Barbell Squat',
  14: 'Front Barbell Squat',
  15: 'Leg Press',
  16: 'Romanian Deadlift',
  17: 'Bodyweight Walking Lunge',
  18: 'Leg Extensions',
  19: 'Lying Leg Curls',
  20: 'Barbell Hip Thrust',
  21: 'Standing Calf Raises',
  22: 'Standing Military Press',
  23: 'Arnold Dumbbell Press',
  24: 'Side Lateral Raise',
  25: 'Reverse Flyes',
  26: 'Barbell Curl',
  27: 'Dumbbell Bicep Curl',
  28: 'Hammer Curls',
  29: 'Triceps Pushdown',
  30: 'Lying Triceps Press',
  31: 'Crunches',
  32: 'Hanging Leg Raise',
  33: 'Ab Roller',
  34: 'Plank',
  35: 'Side Bridge',
  37: 'Running, Treadmill',
  38: 'Running, Treadmill',
  39: 'Bicycling',
  40: 'Bicycling, Stationary',
  41: 'Rowing, Stationary',
  42: 'Elliptical Trainer',
  43: 'Walking, Treadmill',
  44: 'Rope Jumping',
  46: 'Standing Hamstring and Calf Stretch',
  47: 'Kneeling Hip Flexor',
  48: 'Arm Circles',
  49: 'Bodyweight Squat',
  50: 'Goblet Squat',
  // La zancada búlgara solo se diferencia del split squat en que el pie de
  // atrás va elevado; el movimiento que se ve es el mismo.
  51: 'Split Squat with Dumbbells',
  52: 'Stiff-Legged Dumbbell Deadlift',
  53: 'Dumbbell Step Ups',
  54: 'Butt Lift (Bridge)',
  55: 'Inverted Row',
  56: 'Dumbbell Shrug',
  57: 'Bench Dips',
  58: 'Tricep Dumbbell Kickback',
  59: 'Mountain Climbers',
};

const db = await (await fetch(DB)).json();
const byName = new Map(db.map((e) => [e.name, e]));

const missing = Object.values(MAPPING).filter((name) => !byName.has(name));
if (missing.length > 0) {
  console.error('No están en la base de datos:', missing);
  process.exit(1);
}

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const frames = {};
let bytes = 0;

for (const [index, name] of Object.entries(MAPPING)) {
  const entry = byName.get(name);
  const id = `seed-${index}`;
  const written = [];

  for (const [frame, path] of entry.images.entries()) {
    const response = await fetch(`${IMAGES}/${path}`);
    if (!response.ok) {
      console.error(`  ${id}: no se pudo bajar ${path} (${response.status})`);
      continue;
    }

    const webp = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize({ width: WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toBuffer();

    const file = `${id}-${frame}.webp`;
    await writeFile(join(OUT, file), webp);
    written.push(file);
    bytes += webp.length;
  }

  if (written.length > 0) frames[id] = written;
  console.log(`${id.padEnd(9)} ${name.padEnd(38)} ${written.length} fotogramas`);
}

const lines = Object.entries(frames)
  .map(
    ([id, files]) =>
      `  '${id}': [\n${files.map((f) => `    require('@/assets/exercises/${f}'),`).join('\n')}\n  ],`,
  )
  .join('\n');

await writeFile(
  GENERATED,
  `/**
 * Generado por scripts/fetch-exercise-images.mjs. No editar a mano.
 *
 * Fotogramas de la demostración de cada ejercicio del catálogo inicial:
 * posición inicial y posición final. Imágenes de free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db), dominio público.
 */
import type { ImageSourcePropType } from 'react-native';

export const EXERCISE_DEMOS: Record<string, ImageSourcePropType[]> = {
${lines}
};
`,
);

const files = await readdir(OUT);
console.log(
  `\n${files.length} imágenes, ${(bytes / 1024 / 1024).toFixed(1)} MB en total → assets/exercises/`,
);
console.log(`Módulo generado: src/lib/demos.ts (${Object.keys(frames).length} ejercicios)`);
