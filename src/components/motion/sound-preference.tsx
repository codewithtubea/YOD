"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { createStorageStore } from "@/lib/preference-store";
import { SOUND_STORAGE_KEY } from "@/lib/preferences";

export { SOUND_STORAGE_KEY };

type SoundPreferenceContextValue = {
  enabled: boolean;
  available: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
  play: () => boolean;
};

const SoundPreferenceContext =
  createContext<SoundPreferenceContextValue | null>(null);

const soundStore = createStorageStore<boolean>(
  SOUND_STORAGE_KEY,
  (value) => value === "true",
);

export function SoundPreferenceProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(
    soundStore.subscribe,
    soundStore.getSnapshot,
    soundStore.getServerSnapshot,
  );

  const setEnabled = useCallback((value: boolean) => {
    soundStore.set(value);
  }, []);

  const toggle = useCallback(() => {
    soundStore.set(!soundStore.getSnapshot());
  }, []);

  // Deliberately silent for now: no audio file has been created or licensed
  // for this project. The preference and API exist so a legitimate sound can
  // be added later without changing callers.
  const play = useCallback(() => {
    void enabled;
    return false;
  }, [enabled]);

  const value = useMemo(
    () => ({
      enabled,
      available: false,
      setEnabled,
      toggle,
      play,
    }),
    [enabled, setEnabled, toggle, play],
  );

  return (
    <SoundPreferenceContext.Provider value={value}>
      {children}
    </SoundPreferenceContext.Provider>
  );
}

export function useSoftChime() {
  const context = useContext(SoundPreferenceContext);

  if (!context) {
    throw new Error(
      "useSoftChime must be used inside SoundPreferenceProvider.",
    );
  }

  return context;
}
