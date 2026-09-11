import type { ExerciseKind, Session, SetLog } from '@/lib/types';

/** Errors describe the correction and permit unweighted strength exercises. */
export function setError(set: SetLog, kind: ExerciseKind): string | null {
  if (kind === 'strength' && (!set.reps || !Number.isInteger(set.reps) || set.reps < 1))
    return 'Escribe las repeticiones completas de esta serie.';
  if (set.weightKg != null && set.weightKg < 0) return 'El peso no puede ser negativo.';
  if (set.rpe != null && (set.rpe < 1 || set.rpe > 10))
    return 'El esfuerzo va de 1 a 10. También puedes dejarlo vacío.';
  if (kind !== 'strength' && (!set.durationSec || set.durationSec <= 0))
    return 'Escribe cuánto duró esta serie.';
  if (kind === 'cardio' && (!set.distanceKm || set.distanceKm <= 0))
    return 'Escribe una distancia mayor que cero.';
  return null;
}

/** Compare like exercises and repetitions, not incomparable workout totals. */
export function sessionHighlights(session: Session, history: Session[]): string[] {
  const earlier = history.filter(
    (s) =>
      s.id !== session.id &&
      s.finishedAt &&
      Date.parse(s.startedAt) < Date.parse(session.startedAt),
  );
  const highlights: string[] = [];
  for (const entry of session.entries) {
    const past = earlier.flatMap((s) =>
      s.entries
        .filter((e) => e.exerciseId === entry.exerciseId)
        .flatMap((e) => e.sets.filter((set) => set.done)),
    );
    const current = entry.sets.filter((set) => set.done);
    if (!past.length || !current.length) continue;
    const top = (sets: SetLog[], key: 'reps' | 'weightKg' | 'durationSec' | 'distanceKm') =>
      Math.max(0, ...sets.map((s) => s[key] ?? 0));
    if (entry.kind === 'time' && top(current, 'durationSec') > top(past, 'durationSec'))
      highlights.push(`${entry.name}: tu serie más larga`);
    else if (entry.kind === 'cardio' && top(current, 'distanceKm') > top(past, 'distanceKm'))
      highlights.push(`${entry.name}: tu mayor distancia en una serie`);
    else if (entry.kind === 'strength') {
      if (top(current, 'weightKg') > top(past, 'weightKg'))
        highlights.push(`${entry.name}: nuevo récord de peso`);
      else if (
        current.some((set) => {
          const comparable = past.filter((p) => (p.weightKg ?? 0) === (set.weightKg ?? 0));
          return comparable.length > 0 && (set.reps ?? 0) > top(comparable, 'reps');
        })
      )
        highlights.push(`${entry.name}: más repeticiones con el mismo peso`);
    }
  }
  return highlights;
}
