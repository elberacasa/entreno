import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { uid } from '@/lib/id';
import {
  KEYS,
  KEY_LABEL,
  loadAll,
  loadRest,
  save,
  saveRest,
  stashBroken,
  type AppData,
  type RestState,
  type StorageKey,
} from '@/lib/storage';
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
  /**
   * Qué no se pudo guardar en el teléfono, si es que algo falló. Se acuerda de
   * cada clave por separado: un guardado que va bien no puede tapar el fallo
   * de otro, que era lo que pasaba antes.
   */
  saveError: string | null;
  /**
   * Qué hay guardado que no se pudo leer. Mientras tenga valor, esas claves no
   * se escriben: lo del usuario sigue intacto en el teléfono y solo él decide
   * si se descarta.
   */
  readError: string | null;
  broken: StorageKey[];
  /**
   * Aparta lo ilegible a una clave de respaldo y vuelve a permitir escribir.
   * Devuelve qué no se pudo apartar, para no prometer un respaldo que no está.
   */
  discardBroken: () => Promise<string | null>;

  // Catálogo
  addExercise: (e: Omit<Exercise, 'id'>) => Exercise;
  updateExercise: (id: string, patch: Partial<Exercise>) => void;
  deleteExercise: (id: string) => void;
  exerciseById: (id: string) => Exercise | undefined;

  // Rutinas
  /**
   * Guarda o reemplaza la rutina. La promesa dice qué no se pudo guardar
   * (`null` si todo fue bien), para que quien avise al usuario no le prometa
   * una rutina que en realidad vive solo en memoria.
   */
  upsertRoutine: (r: Routine) => Promise<string | null>;
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

  /**
   * Descanso en curso. Vive aquí y no en el componente para que salir de la
   * sesión -o recargar la app- no se lleve la cuenta atrás por delante.
   */
  rest: RestState | null;
  setRest: (rest: RestState | null) => void;

  /** Devuelve qué no se pudo guardar, igual que `upsertRoutine`. */
  replaceAll: (data: AppData) => Promise<string | null>;
}

const StoreContext = createContext<Store | null>(null);

const EMPTY: AppData = {
  exercises: [],
  routines: [],
  sessions: [],
  schedule: [],
  settings: DEFAULT_SETTINGS,
};

/** Qué clave del disco guarda cada parte de los datos. */
const FIELD_KEY: { [K in keyof AppData]: StorageKey } = {
  exercises: KEYS.exercises,
  routines: KEYS.routines,
  sessions: KEYS.sessions,
  schedule: KEYS.schedule,
  settings: KEYS.settings,
};

function writeField<K extends keyof AppData>(field: K, value: AppData[K]): Promise<void> {
  return (save[field] as (v: AppData[K]) => Promise<void>)(value);
}

/** "los entrenos", "los entrenos y las rutinas", "a, b y c". */
function joinList(items: string[]): string | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [failedKeys, setFailedKeys] = useState<Partial<Record<StorageKey, true>>>({});
  const [broken, setBroken] = useState<StorageKey[]>([]);
  const [rest, putRest] = useState<RestState | null>(null);

  /**
   * Lo que hay ahora mismo, para calcular las escrituras. Antes cada mutación
   * se hacía dentro del actualizador de `setData`: eso evitaba pisar los
   * cambios del mismo tick, pero metía un efecto secundario -guardar- en una
   * función que tiene que ser pura, que es justo lo que el React Compiler no
   * permite. Con la referencia se consigue lo mismo desde fuera.
   */
  const dataRef = useRef<AppData>(EMPTY);
  const brokenRef = useRef<StorageKey[]>([]);

  /**
   * Guardar puede fallar -en web esto es localStorage, y Safari lo bloquea o
   * lo llena-, y hasta ahora nadie miraba el resultado: la serie aparecía
   * marcada en pantalla, viva solo en memoria, y al recargar ya no estaba.
   * Ahora un fallo deja rastro, por clave, para que la app pueda avisar.
   */
  const persist = (key: StorageKey, write: () => Promise<void>): Promise<string | null> => {
    if (brokenRef.current.includes(key)) {
      // Ahí hay algo del usuario que no se pudo leer. Escribir encima lo
      // destruiría para siempre, así que no se escribe hasta que él decida.
      return Promise.resolve(KEY_LABEL[key]);
    }
    return write().then(
      () => {
        setFailedKeys((prev) => {
          if (!prev[key]) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
        return null;
      },
      () => {
        setFailedKeys((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
        return KEY_LABEL[key];
      },
    );
  };

  useEffect(() => {
    let alive = true;
    Promise.all([loadAll(), loadRest()])
      .then(([loaded, storedRest]) => {
        if (!alive) return;
        dataRef.current = loaded.data;
        brokenRef.current = loaded.broken;
        setData(loaded.data);
        setBroken(loaded.broken);
        putRest(storedRest);
        setReady(true);
      })
      .catch(() => {
        if (!alive) return;
        // No se sabe qué hay guardado, así que no se toca nada: se bloquean
        // todas las claves y la app arranca vacía pero sin destruir nada.
        const all = Object.values(KEYS);
        brokenRef.current = all;
        setBroken(all);
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const saveError = useMemo(
    () => joinList(Object.values(KEYS).filter((k) => failedKeys[k]).map((k) => KEY_LABEL[k])),
    [failedKeys],
  );

  const readError = useMemo(
    () => joinList(Object.values(KEYS).filter((k) => broken.includes(k)).map((k) => KEY_LABEL[k])),
    [broken],
  );

  const value = useMemo<Store>(() => {
    const { exercises, routines, sessions, schedule, settings } = data;

    /**
     * Cambia una parte de los datos y la guarda. El valor nuevo se calcula
     * fuera de React, a partir de `dataRef`, para que dos llamadas seguidas en
     * el mismo tick -añadir las seis rutinas de un plan, por ejemplo- no se
     * pisen y solo quede la última.
     */
    const mutate = <K extends keyof AppData>(
      field: K,
      fn: (current: AppData[K]) => AppData[K],
    ): Promise<string | null> => {
      const next = fn(dataRef.current[field]);
      dataRef.current = { ...dataRef.current, [field]: next };
      setData(dataRef.current);
      return persist(FIELD_KEY[field], () => writeField(field, next));
    };

    return {
      ...data,
      ready,
      saveError,
      readError,
      broken,
      rest,

      async discardBroken() {
        const keys = brokenRef.current;
        if (keys.length === 0) return null;
        const failed = await stashBroken(keys);
        brokenRef.current = [];
        setBroken([]);
        return joinList(failed.map((k) => KEY_LABEL[k]));
      },

      setRest(next) {
        putRest(next);
        saveRest(next);
      },

      addExercise(e) {
        const created: Exercise = { ...e, id: uid('ex-'), custom: true };
        void mutate('exercises', (list) => [...list, created]);
        return created;
      },
      updateExercise(id, patch) {
        void mutate('exercises', (list) =>
          list.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        );
      },
      deleteExercise(id) {
        void mutate('exercises', (list) => list.filter((e) => e.id !== id));
      },
      exerciseById(id) {
        return exercises.find((e) => e.id === id);
      },

      upsertRoutine(r) {
        const stamped = { ...r, updatedAt: new Date().toISOString() };
        return mutate('routines', (list) =>
          list.some((x) => x.id === r.id)
            ? list.map((x) => (x.id === r.id ? stamped : x))
            : [...list, stamped],
        );
      },
      deleteRoutine(id) {
        void mutate('routines', (list) => list.filter((r) => r.id !== id));
        // Si la rutina ya no existe, lo que tuviera en la agenda tampoco.
        void mutate('schedule', (list) => list.filter((s) => s.routineId !== id));
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
        void mutate('routines', (list) => [...list, copy]);
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
        void mutate('schedule', (list) => [...list, entry]);
      },
      rescheduleSession(id, at) {
        void mutate('schedule', (list) =>
          list.map((s) => (s.id === id ? { ...s, at: at.toISOString() } : s)),
        );
      },
      unschedule(id) {
        void mutate('schedule', (list) => list.filter((s) => s.id !== id));
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
        void mutate('sessions', (list) => [session, ...list]);
        return session;
      },
      updateSession(id, patch) {
        void mutate('sessions', (list) =>
          list.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        );
      },
      finishSession(id) {
        void mutate('sessions', (list) =>
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
        void mutate('sessions', (list) => list.filter((s) => s.id !== id));
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
        void mutate('settings', (current) => ({ ...current, ...patch }));
      },

      async replaceAll(next) {
        // Restaurar una copia es la decisión del usuario sobre lo que no se
        // pudo leer: se aparta a una clave de respaldo antes de pisarlo, y a
        // partir de ahí esas claves vuelven a admitir escrituras.
        if (brokenRef.current.length > 0) {
          await stashBroken(brokenRef.current);
          brokenRef.current = [];
          setBroken([]);
        }

        dataRef.current = next;
        setData(next);

        const failed = await Promise.all([
          persist(KEYS.exercises, () => save.exercises(next.exercises)),
          persist(KEYS.routines, () => save.routines(next.routines)),
          persist(KEYS.sessions, () => save.sessions(next.sessions)),
          persist(KEYS.schedule, () => save.schedule(next.schedule)),
          persist(KEYS.settings, () => save.settings(next.settings)),
        ]);

        return joinList(failed.filter((f): f is string => f != null));
      },
    };
    // `persist` y `mutate` se apoyan en refs y en setters de estado, que no
    // cambian entre renders; lo que sí hay que recalcular es todo lo que lee
    // de `data`.
  }, [data, ready, saveError, readError, broken, rest]);

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
