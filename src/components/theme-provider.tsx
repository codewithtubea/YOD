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
import { THEME_STORAGE_KEY, type ThemeMode } from "@/lib/preferences";

type ThemeContextValue = {
  mode: ThemeMode;
  resolved: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const themeStore = createStorageStore<ThemeMode>(THEME_STORAGE_KEY, (value) => {
  if (value === "light" || value === "dark") return value;
  return "system";
});

const darkMedia = createMediaStore("(prefers-color-scheme: dark)");

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;

  if (mode === "system") {
    delete root.dataset.theme;
    return;
  }

  root.dataset.theme = mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(
    themeStore.subscribe,
    themeStore.getSnapshot,
    themeStore.getServerSnapshot,
  );
  const systemDark = useSyncExternalStore(
    darkMedia.subscribe,
    darkMedia.getSnapshot,
    darkMedia.getServerSnapshot,
  );

  useEffect(() => {
    applyMode(mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    applyMode(next);
    themeStore.set(next);
  }, []);

  const resolved = mode === "system" ? (systemDark ? "dark" : "light") : mode;

  const value = useMemo(
    () => ({ mode, resolved, setMode }),
    [mode, resolved, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider.");
  }

  return context;
}
