import type { Exercise, Session } from '@/lib/types';

/** Local calendar dates must never be derived with UTC toISOString(). */
export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function monthDays(month: Date): (Date | null)[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const leading = (first.getDay() + 6) % 7;
  const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= count; day++)
    cells.push(new Date(first.getFullYear(), first.getMonth(), day));
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function activityByDay(sessions: Session[]): Map<string, Session[]> {
  const result = new Map<string, Session[]>();
  for (const session of sessions) {
    if (!session.finishedAt) continue;
    const day = localDay(new Date(session.finishedAt));
    result.set(day, [...(result.get(day) ?? []), session]);
  }
  return result;
}

/** Completed sets by the exercise's primary catalog group, not recovery advice. */
export function groupWorkload(
  sessions: Session[],
  exercises: Exercise[],
  since: Date,
  until: Date,
) {
  const groups = new Map(exercises.map((exercise) => [exercise.id, exercise.group]));
  const totals = new Map<string, number>();
  for (const session of sessions) {
    if (!session.finishedAt) continue;
    const end = new Date(session.finishedAt);
    if (end < since || end > until) continue;
    for (const entry of session.entries) {
      const count = entry.sets.filter((set) => set.done).length;
      if (!count) continue;
      const group = groups.get(entry.exerciseId) || 'Sin grupo';
      totals.set(group, (totals.get(group) ?? 0) + count);
    }
  }
  return [...totals]
    .map(([group, sets]) => ({ group, sets }))
    .sort((a, b) => b.sets - a.sets || a.group.localeCompare(b.group));
}

export const PLATES = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
} as const;

/** Finds the closest load at or below target, then minimizes plates per side. */
export function plateLoad(target: number, bar: number, available: number[]) {
  if (
    ![target, bar].every(Number.isFinite) ||
    target < 0 ||
    bar < 0 ||
    target > 1000 ||
    bar > target
  )
    return null;
  const denominations = [
    ...new Set(available.filter((p) => Number.isFinite(p) && p >= 0.25 && p <= 100)),
  ]
    .map((p) => Math.round(p * 100))
    .sort((a, b) => b - a);
  const goal = Math.floor(((target - bar) * 100 + 1e-7) / 2);
  const count = new Float64Array(goal + 1).fill(Infinity);
  const chosen = new Int32Array(goal + 1);
  count[0] = 0;
  for (let weight = 1; weight <= goal; weight++) {
    for (const plate of denominations) {
      if (plate <= weight && count[weight - plate] + 1 < count[weight]) {
        count[weight] = count[weight - plate] + 1;
        chosen[weight] = plate;
      }
    }
  }
  let reached = goal;
  while (reached > 0 && !Number.isFinite(count[reached])) reached--;
  const plates = new Map<number, number>();
  for (let rest = reached; rest > 0;) {
    const plate = chosen[rest];
    plates.set(plate / 100, (plates.get(plate / 100) ?? 0) + 1);
    rest -= plate;
  }
  const total = Math.round((bar + reached / 50) * 100) / 100;
  return {
    total,
    perSide: reached / 100,
    exact: Math.abs(target - total) < 0.001,
    plates: [...plates].map(([weight, quantity]) => ({ weight, quantity })),
  };
}
