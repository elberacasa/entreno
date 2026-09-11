import {
  entryVolume,
  estimate1RM,
  formatDayMonth,
  sessionDistanceKm,
  sessionVolume,
} from '@/lib/format';
import type { ExerciseKind, Session } from '@/lib/types';

export interface ExercisePoint {
  sessionId: string;
  date: string;
  /** Mejor peso levantado ese día (fuerza). */
  topWeightKg: number;
  /** Repeticiones de la mejor serie. */
  topReps: number;
  /** 1RM estimado del mejor set (fuerza). */
  best1RM: number;
  /** Volumen total del ejercicio ese día (fuerza). */
  volumeKg: number;
  /** Distancia acumulada ese día (cardio). */
  distanceKm: number;
  /** Tiempo acumulado ese día (cardio / tiempo). */
  durationSec: number;
  /** Segundos por km del mejor esfuerzo (cardio). */
  paceSecPerKm: number | null;
  /** Mejor serie aislada por duración (tiempo). */
  bestHoldSec: number;
  sets: number;
}

/** Serie temporal de un ejercicio, de más antiguo a más reciente. */
export function exerciseHistory(sessions: Session[], exerciseId: string): ExercisePoint[] {
  const points: ExercisePoint[] = [];

  for (const session of sessions) {
    if (!session.finishedAt) continue;
    const entries = session.entries.filter((e) => e.exerciseId === exerciseId);
    if (entries.length === 0) continue;

    const done = entries.flatMap((e) => e.sets.filter((s) => s.done));
    if (done.length === 0) continue;

    let topWeightKg = 0;
    let topReps = 0;
    let best1RM = 0;
    let distanceKm = 0;
    let durationSec = 0;
    let bestHoldSec = 0;
    let paceSecPerKm: number | null = null;

    for (const set of done) {
      const w = set.weightKg ?? 0;
      const r = set.reps ?? 0;
      if (w > topWeightKg || (w === topWeightKg && r > topReps)) {
        topWeightKg = w;
        topReps = r;
      }
      best1RM = Math.max(best1RM, estimate1RM(w, r));
      distanceKm += set.distanceKm ?? 0;
      durationSec += set.durationSec ?? 0;
      bestHoldSec = Math.max(bestHoldSec, set.durationSec ?? 0);
      if (set.distanceKm && set.durationSec) {
        const pace = set.durationSec / set.distanceKm;
        paceSecPerKm = paceSecPerKm == null ? pace : Math.min(paceSecPerKm, pace);
      }
    }

    points.push({
      sessionId: session.id,
      date: session.finishedAt ?? session.startedAt,
      topWeightKg,
      topReps,
      best1RM,
      volumeKg: entries.reduce((acc, e) => acc + entryVolume(e), 0),
      distanceKm,
      durationSec,
      paceSecPerKm,
      bestHoldSec,
      sets: done.length,
    });
  }

  return points.sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

export interface Records {
  maxWeightKg: number;
  maxWeightReps: number;
  best1RM: number;
  bestVolumeKg: number;
  longestKm: number;
  bestPaceSecPerKm: number | null;
  longestHoldSec: number;
  totalSessions: number;
}

export function records(points: ExercisePoint[]): Records {
  const best = <T>(list: T[], pick: (t: T) => number) =>
    list.reduce((acc, t) => Math.max(acc, pick(t)), 0);

  const paces = points.map((p) => p.paceSecPerKm).filter((p): p is number => p != null);
  const topByWeight = points.reduce<ExercisePoint | null>(
    (acc, p) =>
      acc == null ||
      p.topWeightKg > acc.topWeightKg ||
      (p.topWeightKg === acc.topWeightKg && p.topReps > acc.topReps)
        ? p
        : acc,
    null,
  );

  return {
    maxWeightKg: topByWeight?.topWeightKg ?? 0,
    maxWeightReps: topByWeight?.topReps ?? 0,
    best1RM: best(points, (p) => p.best1RM),
    bestVolumeKg: best(points, (p) => p.volumeKg),
    longestKm: best(points, (p) => p.distanceKm),
    bestPaceSecPerKm: paces.length ? Math.min(...paces) : null,
    longestHoldSec: best(points, (p) => p.bestHoldSec),
    totalSessions: points.length,
  };
}

/** Métrica que tiene sentido graficar según el tipo de ejercicio. */
export function metricFor(kind: ExerciseKind): {
  key: keyof ExercisePoint;
  label: string;
  suffix: string;
  lowerIsBetter?: boolean;
} {
  if (kind === 'cardio') return { key: 'distanceKm', label: 'Distancia', suffix: 'km' };
  if (kind === 'time') return { key: 'bestHoldSec', label: 'Mejor serie', suffix: 's' };
  return { key: 'best1RM', label: '1RM estimado', suffix: 'kg' };
}

export interface WeekBucket {
  /** Lunes de la semana, medianoche local. */
  start: Date;
  label: string;
  sessions: number;
  volumeKg: number;
  distanceKm: number;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (copy.getDay() + 6) % 7; // lunes = 0
  copy.setDate(copy.getDate() - dow);
  return copy;
}

/** Últimas `weeks` semanas, de más antigua a más reciente. */
export function weeklyTotals(sessions: Session[], weeks = 8): WeekBucket[] {
  const thisWeek = startOfWeek(new Date());
  const buckets: WeekBucket[] = [];

  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - i * 7);
    buckets.push({
      start,
      label: formatDayMonth(start),
      sessions: 0,
      volumeKg: 0,
      distanceKm: 0,
    });
  }

  for (const session of sessions) {
    if (!session.finishedAt) continue;
    const start = startOfWeek(new Date(session.finishedAt)).getTime();
    const bucket = buckets.find((b) => b.start.getTime() === start);
    if (!bucket) continue;
    bucket.sessions += 1;
    bucket.volumeKg += sessionVolume(session);
    bucket.distanceKm += sessionDistanceKm(session);
  }

  return buckets;
}

/** Racha de semanas consecutivas (hasta la actual) con al menos un entreno. */
export function weekStreak(sessions: Session[]): number {
  const weeks = weeklyTotals(sessions, 52);
  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weeks[i].sessions > 0) streak += 1;
    // La semana en curso todavía puede completarse: no rompe la racha.
    else if (i !== weeks.length - 1) break;
  }
  return streak;
}
