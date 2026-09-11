import { z } from 'zod';

const id = z.string().min(1).max(200);
const date = z.string().refine((value) => Number.isFinite(Date.parse(value)), 'Fecha no válida');
const number = z.number().finite().nonnegative();
const optionalNumber = number.nullish();
const notes = z.string().optional();
const equipment = z.enum([
  'dumbbells',
  'barbell',
  'bench',
  'pullupBar',
  'machines',
  'cardioMachine',
  'outdoors',
  'abWheel',
]);
const unique = <T extends { id: string }>(items: T[]) =>
  new Set(items.map((item) => item.id)).size === items.length;
const kind = z.enum(['strength', 'cardio', 'time']);

export const exerciseSchema = z.object({
  id,
  name: z.string().min(1),
  kind,
  group: z.string(),
  equipment: z.array(equipment).optional(),
  custom: z.boolean().optional(),
});
export const planItemSchema = z.object({
  id,
  exerciseId: id,
  sets: z.number().int().min(1).max(100),
  reps: optionalNumber,
  weightKg: optionalNumber,
  distanceKm: optionalNumber,
  durationSec: optionalNumber,
  restSec: optionalNumber,
  notes,
});
export const routineSchema = z.object({
  id,
  name: z.string(),
  notes,
  items: z.array(planItemSchema).refine(unique),
  sourceId: z.string().optional(),
  createdAt: date,
  updatedAt: date,
});
export const setSchema = z.object({
  id,
  done: z.boolean(),
  reps: optionalNumber,
  weightKg: optionalNumber,
  distanceKm: optionalNumber,
  durationSec: optionalNumber,
  rpe: optionalNumber,
});
export const sessionSchema = z.object({
  id,
  routineId: z.string().nullish(),
  name: z.string(),
  startedAt: date,
  finishedAt: date.nullish(),
  notes,
  entries: z
    .array(
      z.object({
        id,
        exerciseId: id,
        name: z.string(),
        kind,
        restSec: optionalNumber,
        notes,
        sets: z.array(setSchema).refine(unique),
      }),
    )
    .refine(unique),
});
export const settingsSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).optional(),
  unit: z.enum(['kg', 'lb']),
  defaultRestSec: number,
  bodyweightKg: optionalNumber,
  seedVersion: z.number().int().nonnegative().optional(),
  lastBackupAt: date.optional(),
  profile: z
    .object({
      equipment: z.array(equipment),
      daysPerWeek: z.number().int().min(1).max(6),
      minutesPerSession: z.number().min(15).max(180),
      goal: z.enum(['muscle', 'fat', 'strength', 'performance']),
      experience: z.enum(['beginner', 'regular']).optional(),
      updatedAt: date,
    })
    .nullish(),
});
export const scheduleSchema = z.object({ id, routineId: id, at: date, createdAt: date });
export const dataSchemas = {
  exercises: z.array(exerciseSchema).refine(unique),
  routines: z.array(routineSchema).refine(unique),
  sessions: z
    .array(sessionSchema)
    .refine(unique)
    .refine((items) => items.filter((s) => !s.finishedAt).length <= 1),
  schedule: z.array(scheduleSchema).refine(unique),
  settings: settingsSchema,
};
export const appDataSchema = z.object(dataSchemas);
export const snapshotSchema = z.object({ version: z.literal(2), data: appDataSchema });

// Drafts retain partially edited numbers; only a published routine must meet
// the stricter plan constraints above.
const draftNumber = z.number().finite().nullish();
export const routineDraftSchema = routineSchema.extend({
  items: z.array(
    planItemSchema.extend({
      sets: z.number().finite(),
      reps: draftNumber,
      weightKg: draftNumber,
      distanceKm: draftNumber,
      durationSec: draftNumber,
      restSec: draftNumber,
    }),
  ),
});
