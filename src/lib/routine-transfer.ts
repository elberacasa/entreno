import { z } from 'zod';
import { uid } from '@/lib/id';
import { exerciseSchema, routineSchema } from '@/lib/validation';
import type { AppData } from '@/lib/storage';
import type { Exercise, Routine } from '@/lib/types';

const portableSchema = z
  .object({
    app: z.literal('abenzagym-routine'),
    version: z.literal(1),
    routine: routineSchema.extend({ name: z.string().trim().min(1).max(200) }),
    exercises: z.array(exerciseSchema).min(1).max(200),
  })
  .superRefine((bundle, context) => {
    const ids = new Set(bundle.exercises.map((exercise) => exercise.id));
    if (
      ids.size !== bundle.exercises.length ||
      !bundle.routine.items.length ||
      bundle.routine.items.length > 200 ||
      bundle.routine.items.some((item) => !ids.has(item.exerciseId))
    )
      context.addIssue({ code: 'custom', message: 'La rutina contiene ejercicios incompletos.' });
  });
export type PortableRoutine = z.infer<typeof portableSchema>;

export function exportRoutine(routine: Routine, exercises: Exercise[]): string {
  const used = new Set(routine.items.map((item) => item.exerciseId));
  // Explicit allowlist: never include sessions, profile, or body weight.
  return JSON.stringify(
    portableSchema.parse({
      app: 'abenzagym-routine',
      version: 1,
      routine,
      exercises: exercises.filter((exercise) => used.has(exercise.id)),
    }),
    null,
    2,
  );
}

export function parseRoutine(text: string): PortableRoutine {
  if (text.length > 1_000_000) throw new Error('El archivo es demasiado grande.');
  return portableSchema.parse(JSON.parse(text));
}

export function mergeRoutine(data: AppData, bundle: PortableRoutine): AppData {
  // Validate again at the persistence boundary even when a caller has a typed object.
  const checked = portableSchema.parse(bundle);
  const exercises = [...data.exercises];
  const remap = new Map<string, string>();
  const signature = (e: Exercise) =>
    JSON.stringify([e.name, e.kind, e.group, [...(e.equipment ?? [])].sort()]);
  for (const exercise of checked.exercises) {
    const existing = exercises.find((item) => signature(item) === signature(exercise));
    const id = existing?.id ?? uid('ex-');
    remap.set(exercise.id, id);
    if (!existing) exercises.push({ ...exercise, id, custom: true });
  }
  const date = new Date().toISOString();
  const routine: Routine = {
    ...checked.routine,
    id: uid('rt-'),
    sourceId: undefined,
    createdAt: date,
    updatedAt: date,
    items: checked.routine.items.map((item) => ({
      ...item,
      id: uid('pi-'),
      exerciseId: remap.get(item.exerciseId)!,
    })),
  };
  return { ...data, exercises, routines: [...data.routines, routine] };
}
