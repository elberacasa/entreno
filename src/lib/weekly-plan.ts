import { estimateMinutes, planDayToRoutine, type PlanDay, type PlannedItem } from '@/lib/recommend';
import { SEED_META } from '@/lib/seed';
import { localDay } from '@/lib/training-insights';
import {
  canDoWith,
  type Equipment,
  type Exercise,
  type Routine,
  type Session,
  type TrainingProfile,
} from '@/lib/types';
import type { AppData } from '@/lib/storage';

export const TRAINING_SOURCE = 'https://acsm.org/resistance-training-guidelines-update-2026/';
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
export const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DEFAULT_DAYS: Record<number, number[]> = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 5, 6],
  6: [1, 2, 3, 4, 5, 6],
};
export const GYM_EQUIPMENT: Equipment[] = [
  'dumbbells',
  'barbell',
  'bench',
  'pullupBar',
  'machines',
  'cardioMachine',
];
export const MUSCLE_FOCUS = [
  'Equilibrado',
  'Pecho',
  'Espalda',
  'Pierna',
  'Hombro',
  'Brazo',
  'Core',
];
export const QUICK_PROFILE: TrainingProfile = {
  experience: 'beginner',
  equipment: GYM_EQUIPMENT,
  daysPerWeek: 3,
  minutesPerSession: 45,
  goal: 'muscle',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

type Split = 'full' | 'upper' | 'lower' | 'push' | 'pull';
type Slot = 'squat' | 'hinge' | 'chest' | 'back' | 'shoulder' | 'biceps' | 'triceps' | 'core';
// Curated movement slots prevent a calf raise replacing a squat or a deadlift
// replacing a row. IDs refer to the stable, append-only exercise catalog.
const OPTIONS: Record<Slot, number[]> = {
  squat: [15, 50, 13, 17, 51, 53],
  hinge: [52, 16, 20, 54, 19],
  chest: [2, 0, 1, 5, 4],
  back: [7, 10, 9, 8, 55, 6],
  shoulder: [24, 23, 22, 25],
  biceps: [27, 28, 26],
  triceps: [29, 58, 30],
  core: [34, 31, 35, 36, 33, 32],
};
const SLOTS: Record<Split, Slot[]> = {
  full: ['squat', 'chest', 'back', 'hinge', 'shoulder', 'core'],
  upper: ['chest', 'back', 'shoulder', 'biceps', 'triceps'],
  lower: ['squat', 'hinge', 'core'],
  push: ['chest', 'shoulder', 'triceps'],
  pull: ['back', 'biceps', 'core'],
};
const SPLITS: Record<number, Split[]> = {
  2: ['full', 'full'],
  3: ['full', 'full', 'full'],
  4: ['upper', 'lower', 'upper', 'lower'],
  5: ['push', 'pull', 'lower', 'upper', 'lower'],
  6: ['push', 'pull', 'lower', 'push', 'pull', 'lower'],
};
const LABELS: Record<Split, string> = {
  full: 'Cuerpo completo',
  upper: 'Torso',
  lower: 'Pierna y core',
  push: 'Pecho, hombro y tríceps',
  pull: 'Espalda y bíceps',
};
const PRIORITY_SLOT: Record<string, Slot> = {
  Pecho: 'chest',
  Espalda: 'back',
  Pierna: 'squat',
  Hombro: 'shoulder',
  Brazo: 'biceps',
  Core: 'core',
};
export interface WeeklyDraft {
  days: { weekday: number; plan: PlanDay }[];
  warnings: string[];
  explanation: string;
}

export function primaryGroups(items: { exerciseId: string }[], catalog: Exercise[]): string[] {
  const lookup = new Map(catalog.map((e) => [e.id, e.group]));
  return [...new Set(items.map((i) => lookup.get(i.exerciseId)).filter((g): g is string => !!g))];
}

export function supportsSplit(equipment: Equipment[], catalog: Exercise[]): boolean {
  return OPTIONS.back.some((id) =>
    catalog.some((e) => e.id === `seed-${id}` && canDoWith(e, equipment)),
  );
}

/** Deterministic starter templates informed by ACSM, not a recovery prediction. */
export function buildWeeklyPlan(
  profile: TrainingProfile,
  weekdays: number[],
  focus: string,
  catalog: Exercise[],
): WeeklyDraft {
  const ordered = WEEKDAYS.filter((d) => weekdays.includes(d));
  if (ordered.length < 2 || ordered.length > 6 || ordered.length !== weekdays.length)
    throw new Error('Elige entre dos y seis días distintos.');
  const available = new Map(
    catalog.filter((e) => canDoWith(e, profile.equipment)).map((e) => [e.id, e]),
  );
  const uses = new Map<string, number>();
  const warnings = new Set<string>();
  const canSplit = supportsSplit(profile.equipment, catalog);
  const split: Split[] = canSplit ? SPLITS[ordered.length] : ordered.map(() => 'full');
  const occurrence = new Map<Split, number>();
  let priorityAdditions = 0;
  const days = ordered.map((weekday, index) => {
    const type = split[index];
    const items: PlannedItem[] = [];
    const missing: Slot[] = [];
    const add = (slot: Slot, required = false) => {
      const options = OPTIONS[slot]
        .map((id) => available.get(`seed-${id}`))
        .filter((e): e is Exercise => !!e && !items.some((item) => item.exerciseId === e.id))
        .sort((a, b) => (uses.get(a.id) ?? 0) - (uses.get(b.id) ?? 0));
      const e = options[0];
      if (!e) {
        if (required) missing.push(slot);
        return;
      }
      const compound = SEED_META[e.id]?.tier === 'compound';
      const item: PlannedItem = {
        exerciseId: e.id,
        name: e.name,
        kind: e.kind,
        sets: profile.experience === 'beginner' ? 2 : 3,
        reps:
          e.kind === 'time'
            ? null
            : profile.goal === 'strength' && compound
              ? 6
              : compound
                ? 10
                : 12,
        durationSec: e.kind === 'time' ? 30 : null,
        restSec: compound ? (profile.goal === 'strength' ? 150 : 120) : 75,
      };
      // Keep the fundamental slots; report an overrun instead of silently
      // dropping an entire movement to make a misleading time promise.
      if (!required && estimateMinutes([...items, item]) > profile.minutesPerSession) return;
      items.push(item);
      uses.set(e.id, (uses.get(e.id) ?? 0) + 1);
    };
    const essential = type === 'full' ? 4 : type === 'upper' ? 3 : 2;
    SLOTS[type].slice(0, essential).forEach((slot) => add(slot, true));
    const priority = PRIORITY_SLOT[focus];
    if (priority && (type === 'full' || SLOTS[type].includes(priority))) {
      const before = items.length;
      add(priority);
      priorityAdditions += items.length - before;
    }
    SLOTS[type].slice(essential).forEach((slot) => add(slot));
    if (type === 'lower') {
      add('squat');
      add('hinge');
    }
    if (missing.includes('back'))
      warnings.add(
        'Falta un movimiento de espalda: añade mancuernas, poleas o una barra de dominadas a tu material.',
      );
    if (missing.some((s) => s !== 'back'))
      warnings.add(
        'Tu material o catálogo no permite cubrir todos los movimientos previstos. Revisa las sesiones antes de guardar.',
      );
    const minutes = estimateMinutes(items);
    if (minutes > profile.minutesPerSession)
      warnings.add(
        `Los movimientos básicos necesitan hasta ${minutes} min con sus descansos. El tiempo mostrado es una estimación, no un límite obligatorio.`,
      );
    const letter = occurrence.get(type) ?? 0;
    occurrence.set(type, letter + 1);
    return {
      weekday,
      plan: {
        key: `${type}-${index}`,
        name: `${LABELS[type]} ${String.fromCharCode(65 + letter)}`,
        focus: LABELS[type],
        items,
        minutes,
      },
    };
  });
  const rotationGroups = (items: PlannedItem[]) =>
    items
      .map((item) => {
        const group = catalog.find((e) => e.id === item.exerciseId)?.group;
        // The catalog groups both biceps and triceps as "Brazo". Their known
        // push/pull metadata keeps distinct arm movements from false conflicts.
        return group === 'Brazo' ? `${group}:${SEED_META[item.exerciseId]?.pattern}` : group;
      })
      .filter((group) => group && group !== 'Core');
  // Includes the Sunday-to-Monday boundary of this repeating schedule.
  for (const day of days) {
    const next = days.find((d) => d.weekday === (day.weekday + 1) % 7);
    if (
      next &&
      rotationGroups(day.plan.items).some((g) => rotationGroups(next.plan.items).includes(g))
    )
      warnings.add(
        `${DAY_NAMES[day.weekday]} y ${DAY_NAMES[next.weekday].toLowerCase()} repiten grupos principales en días consecutivos. Separa esos días si necesitas más descanso.`,
      );
  }
  if (
    focus !== 'Equilibrado' &&
    !days.some((d) => primaryGroups(d.plan.items, catalog).includes(focus))
  )
    warnings.add(
      `No se pudo incluir tu prioridad (${focus.toLowerCase()}) con este material y tiempo. Prueba más minutos o cambia el material.`,
    );
  else if (focus !== 'Equilibrado' && priorityAdditions === 0)
    warnings.add(
      'No cabe trabajo adicional para tu prioridad con este tiempo y material. Conservamos los movimientos básicos; prueba más tiempo o material adicional.',
    );
  return {
    days,
    warnings: [...warnings],
    explanation: !canSplit
      ? 'Con este material usamos sesiones de cuerpo completo. Recomendamos 2–3 días separados y ampliar el material para entrenar espalda.'
      : ordered.length <= 3
        ? 'Cuerpo completo con días separados: repites los movimientos principales a lo largo de la semana.'
        : ordered.length === 4
          ? 'Torso y pierna se alternan. Cada zona tiene dos sesiones semanales.'
          : 'Alternamos empuje, tirón y pierna para repartir las sesiones entre grupos musculares.',
  };
}

export function weeklyCoverage(draft: WeeklyDraft, catalog: Exercise[]) {
  const groups = new Map<string, { group: string; sets: number; days: Set<number> }>();
  const lookup = new Map(catalog.map((e) => [e.id, e.group]));
  for (const day of draft.days)
    for (const item of day.plan.items) {
      const group = lookup.get(item.exerciseId);
      if (!group) continue;
      const row = groups.get(group) ?? { group, sets: 0, days: new Set<number>() };
      row.sets += item.sets;
      row.days.add(day.weekday);
      groups.set(group, row);
    }
  return [...groups.values()].map((row) => ({ ...row, days: row.days.size }));
}

/** Save the entire week and its settings as one snapshot; keep existing history. */
export function mergeWeeklyPlan(
  data: AppData,
  draft: WeeklyDraft,
  profile: TrainingProfile,
  focus: string,
): AppData {
  const updatedAt = new Date().toISOString();
  const plannedProfile = { ...profile, daysPerWeek: draft.days.length, updatedAt };
  const generated = draft.days.map(({ weekday, plan }) => {
    const previousId = data.settings.weeklyPlan?.days.find((d) => d.weekday === weekday)?.routineId;
    const previous = data.routines.find((r) => r.id === previousId);
    const routine = planDayToRoutine(plan, plannedProfile, plan.name);
    // Reconfiguring a week updates its assigned routines instead of creating
    // duplicates. Sessions store their own entries and remain untouched.
    return {
      weekday,
      routine: previous ? { ...routine, id: previous.id, createdAt: previous.createdAt } : routine,
    };
  });
  const replaced = new Set(generated.map((d) => d.routine.id));
  return {
    ...data,
    routines: [
      ...generated.map((d) => d.routine),
      ...data.routines.filter((r) => !replaced.has(r.id)),
    ],
    settings: {
      ...data.settings,
      profile: plannedProfile,
      weeklyPlan: {
        version: 1,
        focus,
        updatedAt,
        days: generated.map(({ weekday, routine }) => ({ weekday, routineId: routine.id })),
      },
    },
  };
}

export function weeklyOccurrences(
  data: Pick<AppData, 'settings' | 'routines' | 'sessions'>,
  now: Date,
) {
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - ((now.getDay() + 6) % 7),
    12,
  );
  return WEEKDAYS.map((weekday, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const assigned = data.settings.weeklyPlan?.days.find((d) => d.weekday === weekday);
    const routine = data.routines.find((r) => r.id === assigned?.routineId);
    const completed = routine
      ? data.sessions.some(
          (s) =>
            s.routineId === routine.id &&
            s.finishedAt &&
            localDay(new Date(s.finishedAt)) === localDay(date),
        )
      : false;
    return { weekday, date, routine, completed, missing: !!assigned && !routine };
  });
}

export function nextWeeklySession(
  data: Pick<AppData, 'settings' | 'routines' | 'sessions'>,
  now: Date,
): { routine: Routine; date: Date; today: boolean } | null {
  for (let offset = 0; offset < 8; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12);
    const assigned = data.settings.weeklyPlan?.days.find((d) => d.weekday === date.getDay());
    const routine = data.routines.find((r) => r.id === assigned?.routineId);
    if (!routine) continue;
    const done = data.sessions.some(
      (s: Session) =>
        s.routineId === routine.id &&
        s.finishedAt &&
        localDay(new Date(s.finishedAt)) === localDay(date),
    );
    if (!done) return { routine, date, today: offset === 0 };
  }
  return null;
}
