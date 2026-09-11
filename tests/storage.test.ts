import { beforeEach, describe, expect, it, vi } from 'vitest';

const disk = vi.hoisted(() => new Map<string, string>());
const adapter = vi.hoisted(() => ({
  getAllKeys: vi.fn(async () => [...disk.keys()]),
  getItem: vi.fn(async (key: string) => disk.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => {
    disk.set(key, value);
  }),
  multiRemove: vi.fn(async (keys: string[]) => {
    keys.forEach((key) => disk.delete(key));
  }),
}));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: adapter }));

import {
  exportPayload,
  KEYS,
  loadAll,
  parseBackup,
  saveSnapshot,
  SNAPSHOT_KEY,
  stashBroken,
  wipeAll,
  type AppData,
} from '@/lib/storage';
import { DEFAULT_SETTINGS } from '@/lib/types';

const empty = (): AppData => ({
  exercises: [],
  sessions: [],
  routines: [],
  schedule: [],
  settings: { ...DEFAULT_SETTINGS, seedVersion: 60 },
});
beforeEach(async () => {
  disk.clear();
  adapter.getItem.mockClear();
  adapter.setItem.mockReset();
  adapter.setItem.mockImplementation(async (key, value) => {
    disk.set(key, value);
  });
  await loadAll();
});

describe('backup validation and migration', () => {
  it('round-trips a supported backup', () => {
    expect(parseBackup(JSON.stringify(exportPayload(empty())))?.sessions).toEqual([]);
  });
  it.each([
    { sessions: [null] },
    { routines: [{ id: 'bad' }] },
    { settings: { ...DEFAULT_SETTINGS, unit: 'stones' } },
    { version: 99 },
    { app: 'another-app' },
  ])('rejects malformed or unsupported data: %j', (patch) => {
    expect(parseBackup(JSON.stringify({ ...exportPayload(empty()), ...patch }))).toBeNull();
  });
  it('supports backups made before scheduling existed', () => {
    const raw = { ...exportPayload(empty()), schedule: undefined };
    expect(parseBackup(JSON.stringify(raw))?.schedule).toEqual([]);
  });
  it('loads legacy keys and leaves originals intact after migration', async () => {
    disk.set(KEYS.settings, JSON.stringify({ ...DEFAULT_SETTINGS, unit: 'lb' }));
    const old = disk.get(KEYS.settings);
    const loaded = await loadAll();
    expect(loaded.broken).toEqual([]);
    expect(loaded.data.settings.unit).toBe('lb');
    await saveSnapshot(loaded.data);
    expect(disk.get(KEYS.settings)).toBe(old);
    expect((await loadAll()).data.settings.unit).toBe('lb');
  });
  it('blocks malformed nested data without overwriting the original', async () => {
    disk.set(KEYS.sessions, '[null]');
    const loaded = await loadAll();
    expect(loaded.broken).toContain(KEYS.sessions);
    expect(disk.get(KEYS.sessions)).toBe('[null]');
  });
  it('never falls back to stale legacy history after a corrupt snapshot', async () => {
    disk.set(SNAPSHOT_KEY, '{broken');
    const loaded = await loadAll();
    expect(loaded.broken).toEqual(Object.values(KEYS));
    expect(disk.get(SNAPSHOT_KEY)).toBe('{broken');
  });
});

describe('atomic snapshots', () => {
  it('keeps the prior entire snapshot on a failed restore and permits retry', async () => {
    await saveSnapshot(empty());
    const previous = disk.get(SNAPSHOT_KEY);
    const next = { ...empty(), settings: { ...DEFAULT_SETTINGS, unit: 'lb' as const } };
    adapter.setItem.mockRejectedValueOnce(new Error('quota'));
    await expect(saveSnapshot(next)).rejects.toThrow('quota');
    expect(disk.get(SNAPSHOT_KEY)).toBe(previous);
    await saveSnapshot(next);
    expect((await loadAll()).data.settings.unit).toBe('lb');
  });
  it('serializes writes even if the first adapter write is delayed', async () => {
    let release!: () => void;
    adapter.setItem.mockImplementationOnce(async (key, value) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      disk.set(key, value);
    });
    const first = saveSnapshot(empty());
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    const second = saveSnapshot({ ...empty(), settings: { ...DEFAULT_SETTINGS, unit: 'lb' } });
    release();
    await Promise.all([first, second]);
    expect((await loadAll()).data.settings.unit).toBe('lb');
  });
  it('reports quarantine failure while preserving original content', async () => {
    disk.set(SNAPSHOT_KEY, 'unreadable');
    adapter.setItem.mockRejectedValueOnce(new Error('quota'));
    expect(await stashBroken(Object.values(KEYS))).toEqual(Object.values(KEYS));
    expect(disk.get(SNAPSHOT_KEY)).toBe('unreadable');
  });
  it('reset removes the new snapshot and legacy keys', async () => {
    await saveSnapshot(empty());
    disk.set(KEYS.sessions, '[]');
    disk.set('wk.draft.new', '{}');
    await wipeAll();
    expect(disk.has(SNAPSHOT_KEY)).toBe(false);
    expect(disk.has(KEYS.sessions)).toBe(false);
    expect(disk.has('wk.draft.new')).toBe(false);
  });
});

it('does not silently overwrite a snapshot changed by another tab', async () => {
  await saveSnapshot(empty());
  const external = JSON.stringify({
    version: 2,
    data: { ...empty(), settings: { ...DEFAULT_SETTINGS, unit: 'lb' } },
  });
  disk.set(SNAPSHOT_KEY, external);
  await expect(saveSnapshot(empty())).rejects.toThrow('otra pestaña');
  expect(disk.get(SNAPSHOT_KEY)).toBe(external);
});
