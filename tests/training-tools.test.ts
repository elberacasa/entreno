import { describe, expect, it } from 'vitest';
import { settingsSchema } from '@/lib/validation';
import {
  activityByDay,
  groupWorkload,
  localDay,
  monthDays,
  plateLoad,
  PLATES,
} from '@/lib/training-insights';
import { exportRoutine, mergeRoutine, parseRoutine } from '@/lib/routine-transfer';
import type { AppData } from '@/lib/storage';
import type { Exercise, Routine, Session } from '@/lib/types';

const exercise: Exercise = {
  id: 'e',
  name: 'Press',
  kind: 'strength',
  group: 'Pecho',
  equipment: ['barbell'],
};
const routine: Routine = {
  id: 'r',
  name: 'Fuerza',
  createdAt: '2026-09-01',
  updatedAt: '2026-09-01',
  items: [{ id: 'p', exerciseId: 'e', sets: 3, reps: 8 }],
};
const session: Session = {
  id: 's',
  name: 'Personal session',
  startedAt: '2026-09-05T10:00:00',
  finishedAt: '2026-09-05T11:00:00',
  entries: [
    {
      id: 'entry',
      exerciseId: 'e',
      name: 'Press',
      kind: 'strength',
      sets: [
        { id: '1', done: true, reps: 8 },
        { id: '2', done: false, reps: 8 },
      ],
    },
  ],
};
const data: AppData = {
  exercises: [exercise],
  routines: [routine],
  sessions: [session],
  schedule: [],
  settings: { unit: 'kg', defaultRestSec: 90, bodyweightKg: 81 },
};

describe('local calendar and workload', () => {
  it('uses local dates and Monday-first month padding, including leap years', () => {
    expect(localDay(new Date(2026, 0, 2, 23, 59))).toBe('2026-01-02');
    const days = monthDays(new Date(2024, 1, 15));
    expect(days.slice(0, 3)).toEqual([null, null, null]);
    expect(days.filter(Boolean)).toHaveLength(29);
    expect(days.length % 7).toBe(0);
  });
  it('ignores unfinished sessions and counts all workouts on the same day', () => {
    expect(
      activityByDay([session, { ...session, id: 's2' }, { ...session, finishedAt: null }]).get(
        '2026-09-05',
      ),
    ).toHaveLength(2);
  });
  it('counts only completed sets within the requested interval', () => {
    expect(
      groupWorkload(
        [session, { ...session, finishedAt: null }],
        [exercise],
        new Date('2026-09-01'),
        new Date('2026-09-10'),
      ),
    ).toEqual([{ group: 'Pecho', sets: 1 }]);
    expect(
      groupWorkload([session], [exercise], new Date('2026-09-06'), new Date('2026-09-10')),
    ).toEqual([]);
  });
});
describe('plate loading', () => {
  it('loads a balanced bar and combines duplicate plates per side', () => {
    expect(plateLoad(120, 20, [...PLATES.kg])).toMatchObject({
      total: 120,
      perSide: 50,
      exact: true,
      plates: [{ weight: 25, quantity: 2 }],
    });
  });
  it('finds an exact solution when a greedy algorithm would fail', () => {
    expect(plateLoad(12, 0, [4, 3])).toMatchObject({
      total: 12,
      exact: true,
      plates: [{ weight: 3, quantity: 2 }],
    });
  });
  it('never silently rounds above the requested total', () => {
    expect(plateLoad(62, 20, [20, 5])).toMatchObject({ total: 60, exact: false });
    expect(plateLoad(45, 45, [...PLATES.lb])).toMatchObject({ total: 45, exact: true, plates: [] });
  });
  it('rejects invalid totals and handles unavailable plates', () => {
    expect(plateLoad(10, 20, [5])).toBeNull();
    expect(plateLoad(Infinity, 20, [5])).toBeNull();
    expect(plateLoad(1001, 20, [5])).toBeNull();
    expect(plateLoad(60, 20, [])).toMatchObject({ total: 20, exact: false });
  });
});
describe('portable routines', () => {
  it('exports only the routine and required exercises, never personal records', () => {
    const text = exportRoutine(routine, [exercise, { ...exercise, id: 'unused' }]);
    expect(JSON.parse(text).exercises).toHaveLength(1);
    expect(text).not.toContain('Personal session');
    expect(text).not.toContain('bodyweightKg');
    expect(Object.keys(JSON.parse(text))).toEqual(['app', 'version', 'routine', 'exercises']);
  });
  it('merges with fresh routine IDs and reuses an equivalent exercise', () => {
    const next = mergeRoutine(data, parseRoutine(exportRoutine(routine, [exercise])));
    expect(next.routines).toHaveLength(2);
    expect(next.routines[1].id).not.toBe(routine.id);
    expect(next.routines[1].items[0].id).not.toBe('p');
    expect(next.exercises).toHaveLength(1);
    expect(next.sessions).toBe(data.sessions);
    expect(data.routines).toHaveLength(1);
  });
  it('remaps colliding custom exercise IDs without modifying the original', () => {
    const bundle = parseRoutine(exportRoutine(routine, [{ ...exercise, name: 'Custom press' }]));
    const next = mergeRoutine(data, bundle);
    expect(next.exercises).toHaveLength(2);
    expect(next.exercises[0].name).toBe('Press');
    expect(next.routines[1].items[0].exerciseId).not.toBe('e');
  });
  it('rejects unknown formats, oversized files, and missing exercise references', () => {
    expect(() => parseRoutine('{}')).toThrow();
    expect(() => parseRoutine(' '.repeat(1_000_001))).toThrow();
    expect(() => exportRoutine(routine, [])).toThrow();
  });
});

it('preserves a valid appearance preference while accepting older settings', () => {
  expect(settingsSchema.parse({ unit: 'kg', defaultRestSec: 90, theme: 'dark' }).theme).toBe(
    'dark',
  );
  expect(settingsSchema.parse({ unit: 'kg', defaultRestSec: 90 }).theme).toBeUndefined();
  expect(
    settingsSchema.safeParse({ unit: 'kg', defaultRestSec: 90, theme: 'invalid' }).success,
  ).toBe(false);
});
