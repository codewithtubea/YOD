export type ReadableStore<T> = {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
};

export type WritableStore<T> = ReadableStore<T> & {
  set: (value: T) => void;
  clear: () => void;
};

const memory = new Map<string, string>();

function read(key: string) {
  try {
    const stored = window.localStorage.getItem(key);
    return stored ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing. The in-memory fallback
    // still lets the preference work for this session.
  }
}

function remove(key: string) {
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore unavailable storage.
  }
}

export function createStorageStore<T>(
  key: string,
  parse: (value: string | null) => T,
): WritableStore<T> {
  const listeners = new Set<() => void>();

  function notify() {
    for (const listener of listeners) listener();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);

      const onStorage = (event: StorageEvent) => {
        if (event.key === key) listener();
      };

      window.addEventListener("storage", onStorage);

      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot() {
      return parse(read(key));
    },
    getServerSnapshot() {
      return parse(null);
    },
    set(value) {
      write(key, String(value));
      notify();
    },
    clear() {
      remove(key);
      notify();
    },
  };
}

export function createMediaStore(query: string): ReadableStore<boolean> {
  return {
    subscribe(listener) {
      const media = window.matchMedia(query);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    },
    getSnapshot() {
      return window.matchMedia(query).matches;
    },
    getServerSnapshot() {
      return false;
    },
  };
}
