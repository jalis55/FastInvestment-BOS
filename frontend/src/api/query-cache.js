// In-memory only: never persist financial data or authentication state to storage.
export function createQueryCache() {
  const entries = new Map();
  const initial = { data: undefined, error: null, loading: true, refreshing: false };
  const get = (key) => {
    if (!entries.has(key)) entries.set(key, {
      snapshot: initial, listeners: new Set(), updated: 0, generation: 0,
    });
    return entries.get(key);
  };
  const notify = (entry, snapshot) => {
    entry.snapshot = snapshot;
    entry.listeners.forEach((listener) => listener());
  };
  const load = (key, loader, { staleTime = 30000, force = false } = {}) => {
    const entry = get(key);
    entry.loader = loader;
    if (entry.promise) return entry.promise;
    if (!force && entry.updated && Date.now() - entry.updated < staleTime) return Promise.resolve(entry.snapshot.data);
    const generation = ++entry.generation;
    const controller = new AbortController();
    entry.controller = controller;
    notify(entry, { ...entry.snapshot, error: null, loading: entry.snapshot.data === undefined, refreshing: true });
    entry.promise = Promise.resolve().then(() => loader(controller.signal)).then(
      (data) => {
        if (generation === entry.generation) {
          entry.updated = Date.now();
          notify(entry, { data, error: null, loading: false, refreshing: false });
        }
        return data;
      },
      (error) => {
        if (generation === entry.generation) {
          notify(entry, { ...entry.snapshot, error, loading: false, refreshing: false });
        }
        // Errors are exposed through the snapshot, so effects cannot leak rejected promises.
      },
    ).finally(() => {
      if (generation === entry.generation) entry.promise = null;
    });
    return entry.promise;
  };
  const reset = (entry, clear) => {
    entry.generation += 1;
    entry.controller?.abort();
    entry.promise = null;
    entry.updated = 0;
    notify(entry, clear ? initial : { ...entry.snapshot, error: null });
  };
  return {
    snapshot: (key) => get(key).snapshot,
    subscribe(key, listener) {
      const entry = get(key);
      entry.listeners.add(listener);
      return () => {
        entry.listeners.delete(listener);
        // Allow React StrictMode's immediate resubscription to share the same request.
        queueMicrotask(() => {
          if (!entry.listeners.size && entry.promise) reset(entry, false);
        });
      };
    },
    load,
    invalidate() {
      entries.forEach((entry, key) => {
        reset(entry, false);
        if (entry.listeners.size && entry.loader) load(key, entry.loader, { force: true });
      });
    },
    clear() {
      entries.forEach((entry) => reset(entry, true));
    },
  };
}

export const queryCache = createQueryCache();
