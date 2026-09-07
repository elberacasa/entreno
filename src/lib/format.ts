import type { Session, SessionEntry, SetLog } from '@/lib/types';

const KG_PER_LB = 0.45359237;

export function toDisplayWeight(kg: number, unit: 'kg' | 'lb'): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

export function fromDisplayWeight(value: number, unit: 'kg' | 'lb'): number {
  return unit === 'kg' ? value : value * KG_PER_LB;
}

/** Redondea a 2 decimales y quita ceros sobrantes: 62.50 -> "62.5". */
export function num(value: number | null | undefined, digits = 2): string {
  if (value == null || Number.isNaN(value)) return '';
  return String(Math.round(value * 10 ** digits) / 10 ** digits);
}

export function parseNum(text: string): number | null {
  const clean = text.replace(',', '.').trim();
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

/** 3725 -> "1:02:05", 125 -> "2:05". */
export function formatDuration(totalSec: number | null | undefined): string {
  if (totalSec == null || !Number.isFinite(totalSec)) return '—';
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** "1:30" o "90" -> 90 segundos. */
export function parseDuration(text: string): number | null {
  const clean = text.trim();
  if (!clean) return null;
  if (!clean.includes(':')) return parseNum(clean);
  const parts = clean.split(':').map((p) => Number(p.trim() || 0));
  if (parts.some((p) => !Number.isFinite(p))) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/** Ritmo en min/km a partir de km y segundos. */
export function pacePerKm(km: number, sec: number): string {
  if (!km || !sec) return '—';
  const secPerKm = sec / km;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** "hoy", "ayer", "hace 3 d", o la fecha. */
export function relativeDay(iso: string): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(new Date()) - start(new Date(iso))) / 86_400_000);
  if (days === 0) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} d`;
  return formatDate(iso);
}

export function sessionDurationSec(session: Session): number | null {
  if (!session.finishedAt) return null;
  return Math.round(
    (new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime()) / 1000,
  );
}

export const isDone = (s: SetLog) => s.done;

/** Volumen de una serie de fuerza (peso x reps), 0 si no aplica. */
export function setVolume(set: SetLog): number {
  if (!set.done) return 0;
  return (set.weightKg ?? 0) * (set.reps ?? 0);
}

export function entryVolume(entry: SessionEntry): number {
  if (entry.kind !== 'strength') return 0;
  return entry.sets.reduce((acc, s) => acc + setVolume(s), 0);
}

export function sessionVolume(session: Session): number {
  return session.entries.reduce((acc, e) => acc + entryVolume(e), 0);
}

export function sessionDistanceKm(session: Session): number {
  return session.entries.reduce(
    (acc, e) =>
      acc +
      e.sets.reduce((a, s) => a + (s.done ? (s.distanceKm ?? 0) : 0), 0),
    0,
  );
}

export function sessionSetCount(session: Session): number {
  return session.entries.reduce(
    (acc, e) => acc + e.sets.filter((s) => s.done).length,
    0,
  );
}

/** 1RM estimado (Epley). */
export function estimate1RM(weightKg: number, reps: number): number {
  if (!weightKg || !reps) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Resumen de una serie para mostrarla en una línea. */
export function describeSet(set: SetLog, kind: SessionEntry['kind'], unit: 'kg' | 'lb'): string {
  if (kind === 'cardio') {
    const bits: string[] = [];
    if (set.distanceKm) bits.push(`${num(set.distanceKm)} km`);
    if (set.durationSec) bits.push(formatDuration(set.durationSec));
    if (set.distanceKm && set.durationSec) bits.push(pacePerKm(set.distanceKm, set.durationSec));
    return bits.join(' · ') || '—';
  }
  if (kind === 'time') {
    return set.durationSec ? formatDuration(set.durationSec) : '—';
  }
  const w = set.weightKg ? `${num(toDisplayWeight(set.weightKg, unit))} ${unit}` : null;
  const r = set.reps ? `${set.reps} reps` : null;
  return [w, r].filter(Boolean).join(' × ') || '—';
}

/** "1 serie" / "3 series": concuerda el número con el sustantivo. */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export const setsLabel = (n: number) => plural(n, 'serie', 'series');
export const exercisesLabel = (n: number) => plural(n, 'ejercicio', 'ejercicios');
