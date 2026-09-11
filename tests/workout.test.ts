import { describe, expect, it } from 'vitest';
import { fromDisplayWeight, pacePerKm, toDisplayWeight } from '@/lib/format';
import { buildPlan } from '@/lib/recommend';
import { seedExercises } from '@/lib/seed';
import { exerciseHistory, records } from '@/lib/stats';
import { setError, sessionHighlights } from '@/lib/workout';
import type { Session, SetLog } from '@/lib/types';

const set = (patch: Partial<SetLog> = {}): SetLog => ({
  id: 'set',
  done: true,
  reps: 8,
  weightKg: 20,
  ...patch,
});
const session = (id: string, date: string, reps: number): Session => ({
  id,
  name: 'Entreno',
  startedAt: date,
  finishedAt: date,
  entries: [
    { id: 'entry', exerciseId: 'exercise', name: 'Press', kind: 'strength', sets: [set({ reps })] },
  ],
});
describe('logging and results', () => {
  it('allows unweighted sets but rejects impossible effort and fractional reps', () => {
    expect(setError(set({ weightKg: null }), 'strength')).toBeNull();
    expect(setError(set({ rpe: 99 }), 'strength')).toBeTruthy();
    expect(setError(set({ reps: 2.5 }), 'strength')).toBeTruthy();
    expect(setError(set({ reps: null }), 'strength')).toBeTruthy();
  });
  it('requires distance and duration for cardio', () => {
    expect(setError(set({ durationSec: 60 }), 'cardio')).toBeTruthy();
    expect(setError(set({ durationSec: 60, distanceKm: 0.2 }), 'cardio')).toBeNull();
  });
  it('round-trips pounds without changing the physical weight', () => {
    expect(fromDisplayWeight(180, 'lb')).toBeCloseTo(81.6466, 3);
    expect(toDisplayWeight(fromDisplayWeight(180, 'lb'), 'lb')).toBeCloseTo(180);
  });
  it('carries pace rounding across a minute boundary', () => {
    expect(pacePerKm(1, 299.8)).toBe('5:00 /km');
  });
  it('recognizes more repetitions at an equal record weight', () => {
    const older = session('a', '2026-09-01T10:00:00Z', 8);
    const newer = session('b', '2026-09-02T10:00:00Z', 10);
    expect(records(exerciseHistory([older, newer], 'exercise')).maxWeightReps).toBe(10);
    expect(sessionHighlights(newer, [newer, older])).toEqual([
      'Press: más repeticiones con el mismo peso',
    ]);
    expect(sessionHighlights(older, [newer, older])).toEqual([]);
  });
});
describe('equipment and experience', () => {
  const profile = {
    equipment: ['dumbbells'] as 'dumbbells'[],
    daysPerWeek: 3,
    minutesPerSession: 60,
    goal: 'muscle' as const,
    updatedAt: '2026-09-11T00:00:00Z',
  };
  it('does not prescribe an ab wheel unless it is available', () => {
    const plan = buildPlan(profile, seedExercises());
    expect(
      plan.days.flatMap((day) => day.items).some((item) => item.name === 'Rueda abdominal'),
    ).toBe(false);
  });
  it('uses full-body sessions for the three-day beginner option', () => {
    const plan = buildPlan({ ...profile, experience: 'beginner' }, seedExercises());
    expect(plan.days).toHaveLength(3);
    expect(plan.days.every((day) => day.focus === 'Cuerpo completo')).toBe(true);
  });
  it('preserves the existing split for profiles without experience', () => {
    expect(buildPlan(profile, seedExercises()).days.map((day) => day.focus)).toEqual([
      'Empuje',
      'Tirón',
      'Pierna',
    ]);
  });
});
