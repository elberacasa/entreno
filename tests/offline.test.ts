import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

function worker() {
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const cache = { addAll: vi.fn(async () => {}), match: vi.fn(async () => 'offline-shell') };
  const caches = {
    open: vi.fn(async () => cache),
    keys: vi.fn(async () => ['other-app', 'entreno:https://example.test/entreno/:old']),
    delete: vi.fn(async () => true),
  };
  const self = {
    registration: { scope: 'https://example.test/entreno/' },
    location: { origin: 'https://example.test' },
    skipWaiting: vi.fn(async () => {}),
    clients: { claim: vi.fn(async () => {}) },
    addEventListener: (name: string, fn: (event: Record<string, unknown>) => void) =>
      listeners.set(name, fn),
  };
  const fetch = vi.fn(async () => {
    throw new Error('offline');
  });
  runInNewContext(
    readFileSync('public/sw.js', 'utf8').replace(
      '/*__PRECACHE__*/ []',
      JSON.stringify(['https://example.test/entreno/', 'https://example.test/entreno/app.js']),
    ),
    { self, caches, fetch, URL },
  );
  return { listeners, cache, caches, self, fetch };
}
it('installs shell and assets before activating', async () => {
  const w = worker();
  let work!: Promise<void>;
  w.listeners.get('install')!({
    waitUntil: (promise: Promise<void>) => {
      work = promise;
    },
  });
  await work;
  expect(w.cache.addAll).toHaveBeenCalledWith([
    'https://example.test/entreno/',
    'https://example.test/entreno/app.js',
  ]);
  expect(w.self.skipWaiting).toHaveBeenCalledOnce();
});
it('failed precaching does not activate an incomplete offline app', async () => {
  const w = worker();
  w.cache.addAll.mockRejectedValueOnce(new Error('asset unavailable'));
  let work!: Promise<void>;
  w.listeners.get('install')!({
    waitUntil: (promise: Promise<void>) => {
      work = promise;
    },
  });
  await expect(work).rejects.toThrow('asset unavailable');
  expect(w.self.skipWaiting).not.toHaveBeenCalled();
});
it('only deletes old caches belonging to this app scope', async () => {
  const w = worker();
  let work!: Promise<void>;
  w.listeners.get('activate')!({
    waitUntil: (promise: Promise<void>) => {
      work = promise;
    },
  });
  await work;
  expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith(
    'entreno:https://example.test/entreno/:old',
  );
});
it('serves a deep link from the installed shell without a network request', async () => {
  const w = worker();
  let work!: Promise<string>;
  w.listeners.get('fetch')!({
    request: { method: 'GET', url: 'https://example.test/entreno/session/123', mode: 'navigate' },
    respondWith: (promise: Promise<string>) => {
      work = promise;
    },
  });
  expect(await work).toBe('offline-shell');
  expect(w.fetch).not.toHaveBeenCalled();
});
