"use client";

import { useCallback, useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const fallback = new Map<string, boolean>();

function notify() {
  for (const listener of listeners) listener();
}

function read(key: string) {
  if (fallback.has(key)) return fallback.get(key) ?? false;
  try {
    return window.localStorage.getItem(key) === "revealed";
  } catch {
    return false;
  }
}

function write(key: string, revealed: boolean) {
  fallback.set(key, revealed);
  try {
    if (revealed) window.localStorage.setItem(key, "revealed");
    else window.localStorage.removeItem(key);
  } catch {
    // Private browsing can block storage; the in-memory fallback still works.
  }
  notify();
}

export function useAffirmationReveal(storageKey: string) {
  const subscribe = useCallback((listener: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) {
        fallback.delete(storageKey);
        listener();
      }
    };

    listeners.add(listener);
    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }, [storageKey]);

  const getSnapshot = useCallback(() => read(storageKey), [storageKey]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => false);

  const setValue = useCallback(
    (next: boolean) => write(storageKey, next),
    [storageKey],
  );

  return [value, setValue] as const;
}
