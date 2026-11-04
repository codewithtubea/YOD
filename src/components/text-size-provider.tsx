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

import { createStorageStore } from "@/lib/preference-store";
import { TEXT_SIZE_STORAGE_KEY, type TextSize } from "@/lib/preferences";

type TextSizeContextValue = {
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
};

const TextSizeContext = createContext<TextSizeContextValue | null>(null);

const textSizeStore = createStorageStore<TextSize>(
  TEXT_SIZE_STORAGE_KEY,
  (value) => (value === "large" ? "large" : "default"),
);

function applyTextSize(size: TextSize) {
  const root = document.documentElement;

  if (size === "large") {
    root.dataset.textSize = "large";
    return;
  }

  delete root.dataset.textSize;
}

export function TextSizeProvider({ children }: { children: ReactNode }) {
  const textSize = useSyncExternalStore(
    textSizeStore.subscribe,
    textSizeStore.getSnapshot,
    textSizeStore.getServerSnapshot,
  );

  useEffect(() => {
    applyTextSize(textSize);
  }, [textSize]);

  const setTextSize = useCallback((size: TextSize) => {
    applyTextSize(size);
    textSizeStore.set(size);
  }, []);

  const value = useMemo(
    () => ({ textSize, setTextSize }),
    [textSize, setTextSize],
  );

  return (
    <TextSizeContext.Provider value={value}>
      {children}
    </TextSizeContext.Provider>
  );
}

export function useTextSize() {
  const context = useContext(TextSizeContext);

  if (!context) {
    throw new Error("useTextSize must be used inside TextSizeProvider.");
  }

  return context;
}
