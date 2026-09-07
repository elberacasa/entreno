import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { uid } from '@/lib/id';
import { loadAll, save, type AppData } from '@/lib/storage';
import {
  DEFAULT_SETTINGS,
  type Exercise,
  type PlanItem,
  type Routine,
  type ScheduledSession,
  type Session,
  type SessionEntry,
  type SetLog,
  type Settings,
} from '@/lib/types';

interface Store extends AppData {
  ready: boolean;

  // Catálogo
  addExercise: (e: Omit<Exercise, 'id'>) => Exercise;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  deleteExercise: (id: string) => void;
  exerciseById: (id: string) => Exercise | undefined;

  // Rutinas
  upsertRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  duplicateRoutine: (id: string) => Routine | undefined;
  routineById: (id: string) => Routine | undefined;

  // Agenda
  scheduleRoutine: (routineId: string, at: Date) => void;
  rescheduleSession: (id: string, at: Date) => void;
  unschedule: (id: string) => void;
  /** Lo programado de más cercano a más lejano, lo atrasado incluido. */
  upcoming: () => ScheduledSession[];

  // Sesiones
  activeSession: Session | undefined;
  sessionById: (id: string) => Session | undefined;
  startSession: (opts: { routineId?: string | null; name?: string }) => Session;
  updateSession: (id: string, patch: Partial<Session>) => void;
  finishSession: (id: string) => void;
  deleteSession: (id: string) => void;

  /** Última sesión cerrada en la que se hizo ese ejercicio. */
  lastEntryFor: (
    exerciseId: string,
    excludeSessionId?: string,
  ) => { entry: SessionEntry; session: Session } | undefined;

  // Ajustes
  updateSettings: (patch: Partial<Settings>) => void;

  replaceAll: (data: AppData) => void;
}

const StoreContext = createContext<Store | null>(null);

const EMPTY: AppData = {
  exercises: [],
  routines: [],
  sessions: [],
  schedule: [],
  settings: DEFAULT_SETTINGS,
};

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    loadAll().then((loaded) => {
      if (!alive) return;
      setData(loaded);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<Store>(() => {
    const { exercises, routines, sessions, schedule, settings } = data;

    /**
     * Todas las escrituras parten de la lista actual, no de la del render.
     * Si tomaran la del render, dos llamadas seguidas en el mismo tick (añadir
     * las seis rutinas de un plan, por ejemplo) se pisarían y solo quedaría la
     * última.
     */
    const mutateExercises = (fn: (list: Exercise[]) => Exercise[]) => {
      setData((d) => {
        const next = fn(d.exercises);
        void save.exercises(next);
        return { ...d, exercises: next };
      });
    };

    const mutateRoutines = (fn: (list: Routine[]) => Routine[]) => {
      setData((d) => {
        const next = fn(d.routines);
        void save.routines(next);
        return { ...d, routines: next };
      });
    };

    const mutateSessions = (fn: (list: Session[]) => Session[]) => {
      setData((d) => {
        const next = fn(d.sessions);
        void save.sessions(next);
        return { ...d, sessions: next };
      });
    };

    const mutateSchedule = (fn: (list: ScheduledSession[]) => ScheduledSession[]) => {
      setData((d) => {
        const next = fn(d.schedule);
        void save.schedule(next);
        return { ...d, schedule: next };
      });
    };

    return {
      ...data,
      ready,

      addExercise(e) {
        const created: Exercise = { ...e, id: uid('ex-'), custom: true };
        mutateExercises((list) => [...list, created]);
        return created;
      },
      updateExercise(id, patch) {
        mutateExercises((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      },
      deleteExercise(id) {
        mutateExercises((list) => list.filter((e) => e.id !== id));
      },
      exerciseById(id) {
        return exercises.find((e) => e.id === id);
      },

      upsertRoutine(r) {
        const stamped = { ...r, updatedAt: new Date().toISOString() };
        mutateRoutines((list) =>
          list.some((x) => x.id === r.id)
            ? list.map((x) => (x.id === r.id ? stamped : x))
            : [...list, stamped],
        );
      },
      deleteRoutine(id) {
        mutateRoutines((list) => list.filter((r) => r.id !== id));
        // Si la rutina ya no existe, lo que tuviera en la agenda tampoco.
        mutateSchedule((list) => list.filter((s) => s.routineId !== id));
      },
      duplicateRoutine(id) {
        const source = routines.find((r) => r.id === id);
        if (!source) return undefined;
        const now = new Date().toISOString();
        const copy: Routine = {
          ...source,
          id: uid('rt-'),
          name: `${source.name} (copia)`,
          items: source.items.map((i) => ({ ...i, id: uid('pi-') })),
          createdAt: now,
          updatedAt: now,
        };
        mutateRoutines((list) => [...list, copy]);
        return copy;
      },
      routineById(id) {
        return routines.find((r) => r.id === id);
      },

      scheduleRoutine(routineId, at) {
        const entry: ScheduledSession = {
          id: uid('sc-'),
          routineId,
          at: at.toISOString(),
          createdAt: new Date().toISOString(),
        };
        mutateSchedule((list) => [...list, entry]);
      },
      rescheduleSession(id, at) {
        mutateSchedule((list) =>
          list.map((s) => (s.id === id ? { ...s, at: at.toISOString() } : s)),
        );
      },
      unschedule(id) {
        mutateSchedule((list) => list.filter((s) => s.id !== id));
      },
      upcoming() {
        // Lo atrasado sigue en la lista a propósito: si no lo hiciste ayer,
        // quieres verlo, no que desaparezca sin decir nada.
        return schedule
          .filter((s) => routines.some((r) => r.id === s.routineId))
          .sort((a, b) => +new Date(a.at) - +new Date(b.at));
      },

      activeSession: sessions.find((s) => !s.finishedAt),
      sessionById(id) {
        return sessions.find((s) => s.id === id);
      },

      startSession({ routineId, name }) {
        const routine = routineId ? routines.find((r) => r.id === routineId) : undefined;
        const session: Session = {
          id: uid('se-'),
          routineId: routine?.id ?? null,
          name: name?.trim() || routine?.name || 'Entrenamiento libre',
          startedAt: new Date().toISOString(),
          finishedAt: null,
          entries: (routine?.items ?? []).map((item) =>
            planItemToEntry(item, exercises, settings),
          ),
        };
        mutateSessions((list) => [session, ...list]);
        return session;
      },
      updateSession(id, patch) {
        mutateSessions((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      },
      finishSession(id) {
        mutateSessions((list) =>
          list.map((s) =>
            s.id === id
              ? {
                  ...s,
                  finishedAt: new Date().toISOString(),
                  // Al cerrar descartamos lo que quedó sin marcar como hecho.
                  entries: s.entries
                    .map((e) => ({ ...e, sets: e.sets.filter((set) => set.done) }))
                    .filter((e) => e.sets.length > 0),
                }
              : s,
          ),
        );
      },
      deleteSession(id) {
        mutateSessions((list) => list.filter((s) => s.id !== id));
      },

      lastEntryFor(exerciseId, excludeSessionId) {
        for (const session of sessions) {
          if (!session.finishedAt) continue;
          if (session.id === excludeSessionId) continue;
          const entry = session.entries.find(
            (e) => e.exerciseId === exerciseId && e.sets.some((s) => s.done),
          );
          if (entry) return { entry, session };
        }
        return undefined;
      },

      updateSettings(patch) {
        setData((d) => {
          const next = { ...d.settings, ...patch };
          void save.settings(next);
          return { ...d, settings: next };
        });
      },

      replaceAll(next) {
        setData(next);
        void save.exercises(next.exercises);
        void save.routines(next.routines);
        void save.sessions(next.sessions);
        void save.schedule(next.schedule);
        void save.settings(next.settings);
      },
    };
  }, [data, ready]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider');
  return ctx;
}

/** Crea una serie vacía, prellenada con los objetivos del plan si los hay. */
export function makeSet(item?: Partial<PlanItem>): SetLog {
  return {
    id: uid('st-'),
    done: false,
    reps: item?.reps ?? null,
    weightKg: item?.weightKg ?? null,
    distanceKm: item?.distanceKm ?? null,
    durationSec: item?.durationSec ?? null,
    rpe: null,
  };
}

function planItemToEntry(
  item: PlanItem,
  exercises: Exercise[],
  settings: Settings,
): SessionEntry {
  const exercise = exercises.find((e) => e.id === item.exerciseId);
  const count = Math.max(1, item.sets || 1);
  return {
    id: uid('en-'),
    exerciseId: item.exerciseId,
    name: exercise?.name ?? 'Ejercicio',
    kind: exercise?.kind ?? 'strength',
    restSec: item.restSec ?? settings.defaultRestSec,
    notes: item.notes,
    sets: Array.from({ length: count }, () => makeSet(item)),
  };
}

export function makeEntry(exercise: Exercise, restSec: number): SessionEntry {
  return {
    id: uid('en-'),
    exerciseId: exercise.id,
    name: exercise.name,
    kind: exercise.kind,
    restSec,
    sets: [makeSet()],
  };
}
