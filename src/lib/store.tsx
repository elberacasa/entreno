import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { uid } from '@/lib/id';
import { loadAll, save, type AppData } from '@/lib/storage';
import {
  DEFAULT_SETTINGS,
  type Exercise,
  type PlanItem,
  type Routine,
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

  const setExercises = useCallback((next: Exercise[]) => {
    setData((d) => ({ ...d, exercises: next }));
    void save.exercises(next);
  }, []);

  const setRoutines = useCallback((next: Routine[]) => {
    setData((d) => ({ ...d, routines: next }));
    void save.routines(next);
  }, []);

  const value = useMemo<Store>(() => {
    const { exercises, routines, sessions, settings } = data;

    const mutateSessions = (fn: (list: Session[]) => Session[]) => {
      setData((d) => {
        const next = fn(d.sessions);
        void save.sessions(next);
        return { ...d, sessions: next };
      });
    };

    return {
      ...data,
      ready,

      addExercise(e) {
        const created: Exercise = { ...e, id: uid('ex-'), custom: true };
        setExercises([...exercises, created]);
        return created;
      },
      updateExercise(id, patch) {
        setExercises(exercises.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      },
      deleteExercise(id) {
        setExercises(exercises.filter((e) => e.id !== id));
      },
      exerciseById(id) {
        return exercises.find((e) => e.id === id);
      },

      upsertRoutine(r) {
        const exists = routines.some((x) => x.id === r.id);
        const stamped = { ...r, updatedAt: new Date().toISOString() };
        setRoutines(
          exists ? routines.map((x) => (x.id === r.id ? stamped : x)) : [...routines, stamped],
        );
      },
      deleteRoutine(id) {
        setRoutines(routines.filter((r) => r.id !== id));
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
        setRoutines([...routines, copy]);
        return copy;
      },
      routineById(id) {
        return routines.find((r) => r.id === id);
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
        void save.settings(next.settings);
      },
    };
  }, [data, ready, setExercises, setRoutines]);

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
