import { describe, expect, it } from 'vitest';
import { seedExercises } from '@/lib/seed';
import { DEFAULT_SETTINGS, canDoWith, type TrainingProfile } from '@/lib/types';
import {
  buildWeeklyPlan,
  DEFAULT_DAYS,
  GYM_EQUIPMENT,
  mergeWeeklyPlan,
  nextWeeklySession,
  primaryGroups,
  QUICK_PROFILE,
  weeklyOccurrences,
  weeklyCoverage,
} from '@/lib/weekly-plan';
import { appDataSchema } from '@/lib/validation';
import type { AppData } from '@/lib/storage';

const catalog = seedExercises();
const base = (): AppData => ({
  exercises: catalog,
  routines: [],
  sessions: [],
  schedule: [],
  settings: DEFAULT_SETTINGS,
});
const profile: TrainingProfile = { ...QUICK_PROFILE, equipment: GYM_EQUIPMENT };

describe('weekly programming', () => {
  it.each([2, 3, 4, 5, 6])(
    'covers chest, back, and legs at least twice in a %i-day gym week',
    (n) => {
      const draft = buildWeeklyPlan(profile, DEFAULT_DAYS[n], 'Equilibrado', catalog);
      for (const group of ['Pecho', 'Espalda', 'Pierna']) {
        expect(
          draft.days.filter((day) => primaryGroups(day.plan.items, catalog).includes(group)).length,
        ).toBeGreaterThanOrEqual(2);
      }
      expect(draft.days).toHaveLength(n);
      expect(draft.warnings).toEqual([]);
    },
  );
  it.each(
    ([[], ['dumbbells'], GYM_EQUIPMENT] as TrainingProfile['equipment'][]).map((equipment) => ({
      equipment,
    })),
  )('never prescribes unavailable equipment: %j', ({ equipment }) => {
    const draft = buildWeeklyPlan(
      { ...profile, equipment },
      DEFAULT_DAYS[3],
      'Equilibrado',
      catalog,
    );
    for (const { plan } of draft.days)
      for (const item of plan.items) {
        expect(
          canDoWith(
            catalog.find((e) => e.id === item.exerciseId)!,
            equipment,
          ),
        ).toBe(true);
        expect(plan.items.filter((other) => other.exerciseId === item.exerciseId)).toHaveLength(1);
      }
    if (!equipment.length) expect(draft.warnings.join(' ')).toContain('espalda');
  });
  it('falls back to full-body sessions instead of one-exercise upper days with limited equipment', () => {
    const draft = buildWeeklyPlan(
      { ...profile, equipment: [] },
      DEFAULT_DAYS[4],
      'Equilibrado',
      catalog,
    );
    expect(
      draft.days.every((d) => d.plan.focus === 'Cuerpo completo' && d.plan.items.length >= 4),
    ).toBe(true);
    expect(draft.warnings.join(' ')).toContain('espalda');
  });
  it('rotates upper and lower body without consecutive major-group overlap', () => {
    const draft = buildWeeklyPlan(profile, DEFAULT_DAYS[4], 'Equilibrado', catalog);
    expect(draft.days.map((d) => d.plan.focus)).toEqual([
      'Torso',
      'Pierna y core',
      'Torso',
      'Pierna y core',
    ]);
    expect(draft.warnings).toEqual([]);
  });
  it('warns about consecutive full-body days, including across the week boundary', () => {
    const draft = buildWeeklyPlan(profile, [0, 1, 3], 'Equilibrado', catalog);
    expect(draft.warnings.join(' ')).toContain('Domingo y lunes');
  });
  it('increases chest work while retaining squat, hinge, and back movements', () => {
    const balanced = buildWeeklyPlan(profile, DEFAULT_DAYS[3], 'Equilibrado', catalog);
    const focused = buildWeeklyPlan(profile, DEFAULT_DAYS[3], 'Pecho', catalog);
    const chestSets = (draft: typeof balanced) =>
      draft.days
        .flatMap((d) => d.plan.items)
        .filter((i) => catalog.find((e) => e.id === i.exerciseId)?.group === 'Pecho')
        .reduce((sum, i) => sum + i.sets, 0);
    expect(chestSets(focused)).toBeGreaterThan(chestSets(balanced));
    focused.days.forEach((d) =>
      expect(primaryGroups(d.plan.items, catalog)).toEqual(
        expect.arrayContaining(['Pierna', 'Espalda', 'Pecho']),
      ),
    );
  });
  it('is deterministic and reports short-session overruns instead of hiding required exercises', () => {
    const short = { ...profile, minutesPerSession: 15, experience: 'regular' as const };
    const one = buildWeeklyPlan(short, DEFAULT_DAYS[3], 'Equilibrado', catalog);
    expect(buildWeeklyPlan(short, DEFAULT_DAYS[3], 'Equilibrado', catalog)).toEqual(one);
    expect(one.warnings.join(' ')).toContain('min');
    expect(one.days.every((d) => d.plan.items.length >= 4)).toBe(true);
  });
  it('does not silently invent deleted or custom exercise capabilities', () => {
    const draft = buildWeeklyPlan(profile, DEFAULT_DAYS[3], 'Equilibrado', []);
    expect(draft.days.every((d) => d.plan.items.length === 0)).toBe(true);
    expect(draft.warnings.length).toBeGreaterThan(0);
  });
  it.each([[1], [1, 1], [0, 1, 2, 3, 4, 5, 6], [8, 2]].map((days) => ({ days })))(
    'rejects invalid days %j',
    ({ days }) => {
      expect(() => buildWeeklyPlan(profile, days, 'Equilibrado', catalog)).toThrow();
    },
  );
});

describe('planned muscle counts', () => {
  it('counts sets from actual exercises without multiplying indirect muscle work', () => {
    const draft = buildWeeklyPlan(profile, DEFAULT_DAYS[3], 'Equilibrado', catalog);
    const rows = weeklyCoverage(draft, catalog);
    expect(rows.find((row) => row.group === 'Pecho')).toEqual({ group: 'Pecho', days: 3, sets: 6 });
    expect(rows.reduce((total, row) => total + row.sets, 0)).toBe(
      draft.days.flatMap((d) => d.plan.items).reduce((total, item) => total + item.sets, 0),
    );
  });
});

describe('weekly persistence and calendar', () => {
  const create = () =>
    mergeWeeklyPlan(
      base(),
      buildWeeklyPlan(profile, DEFAULT_DAYS[3], 'Equilibrado', catalog),
      profile,
      'Equilibrado',
    );
  it('validates and round-trips the whole plan in existing backup format', () => {
    const data = create();
    expect(appDataSchema.parse(JSON.parse(JSON.stringify(data)))).toEqual(data);
    expect(data.settings.weeklyPlan?.days).toHaveLength(3);
    expect(appDataSchema.parse(base()).settings.weeklyPlan).toBeUndefined();
  });
  it('reconfigures without duplicating assigned routines or changing history and manual appointments', () => {
    const data = create();
    const other = { ...data.routines[0], id: 'personal', name: 'Mi rutina propia' };
    data.routines.push(other);
    const updated = mergeWeeklyPlan(
      data,
      buildWeeklyPlan(profile, DEFAULT_DAYS[3], 'Pecho', catalog),
      profile,
      'Pecho',
    );
    expect(updated.routines).toHaveLength(4);
    expect(updated.routines.find((r) => r.id === 'personal')).toEqual(other);
    expect(updated.routines.map((r) => r.id)).toEqual(data.routines.map((r) => r.id));
    expect(updated.sessions).toBe(data.sessions);
    expect(updated.schedule).toBe(data.schedule);
  });
  it('shows rest days, skips completed sessions, and repeats next week in local time', () => {
    const data = create();
    const friday = new Date(2026, 8, 11, 10);
    const first = nextWeeklySession(data, friday)!;
    expect(first.today).toBe(true);
    data.sessions.push({
      id: 'done',
      name: first.routine.name,
      routineId: first.routine.id,
      startedAt: friday.toISOString(),
      finishedAt: new Date(2026, 8, 11, 11).toISOString(),
      entries: [],
    });
    const next = nextWeeklySession(data, new Date(2026, 8, 11, 12))!;
    expect(next.today).toBe(false);
    expect(next.date.getDate()).toBe(14);
    const week = weeklyOccurrences(data, friday);
    expect(week.filter((day) => day.routine)).toHaveLength(3);
    expect(week.find((day) => day.weekday === 5)?.completed).toBe(true);
    expect(week.find((day) => day.weekday === 6)?.routine).toBeUndefined();
    expect(nextWeeklySession(data, new Date(2026, 8, 18, 10))?.today).toBe(true);
  });
  it('handles missing assigned routines without starting a random replacement', () => {
    const data = create();
    data.routines = [];
    expect(nextWeeklySession(data, new Date())).toBeNull();
    expect(weeklyOccurrences(data, new Date()).filter((d) => d.missing)).toHaveLength(3);
  });
});
