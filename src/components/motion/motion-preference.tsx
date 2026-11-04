"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  createMediaStore,
  createStorageStore,
} from "@/lib/preference-store";
import { MOTION_STORAGE_KEY } from "@/lib/preferences";

export { MOTION_STORAGE_KEY };

export type MotionPreferenceContextValue = {
  reduceMotion: boolean;
  systemReduced: boolean;
  preference: boolean | null;
  setReduceMotion: (value: boolean) => void;
  clearPreference: () => void;
};

const MotionPreferenceContext =
  createContext<MotionPreferenceContextValue | null>(null);

export function resolveReduceMotion(
  systemReduced: boolean,
  preference: boolean | null,
) {
  return systemReduced || preference === true;
}

export function readStoredMotionPreference(
  storage: Pick<Storage, "getItem"> | null,
): boolean | null {
  if (!storage) return null;

  try {
    const value = storage.getItem(MOTION_STORAGE_KEY);
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  } catch {
    return null;
  }
}

const preferenceStore = createStorageStore<boolean | null>(
  MOTION_STORAGE_KEY,
  (value) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  },
);

const motionMedia = createMediaStore("(prefers-reduced-motion: reduce)");

function applyDocumentPreference(reduce: boolean) {
  document.documentElement.dataset.reduceMotion = reduce ? "true" : "false";
}

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    preferenceStore.subscribe,
    preferenceStore.getSnapshot,
    preferenceStore.getServerSnapshot,
  );
  const systemReduced = useSyncExternalStore(
    motionMedia.subscribe,
    motionMedia.getSnapshot,
    motionMedia.getServerSnapshot,
  );
  const reduceMotion = resolveReduceMotion(systemReduced, preference);

  useEffect(() => {
    applyDocumentPreference(reduceMotion);
  }, [reduceMotion]);

  const setReduceMotion = useCallback((value: boolean) => {
    preferenceStore.set(value);
  }, []);

  const clearPreference = useCallback(() => {
    preferenceStore.clear();
  }, []);

  const value = useMemo(
    () => ({
      reduceMotion,
      systemReduced,
      preference,
      setReduceMotion,
      clearPreference,
    }),
    [
      reduceMotion,
      systemReduced,
      preference,
      setReduceMotion,
      clearPreference,
    ],
  );

  return (
    <MotionPreferenceContext.Provider value={value}>
      {children}
    </MotionPreferenceContext.Provider>
  );
}

export function useMotionPreference() {
  const context = useContext(MotionPreferenceContext);

  if (!context) {
    throw new Error(
      "useMotionPreference must be used inside MotionPreferenceProvider.",
    );
  }

  return context;
}
