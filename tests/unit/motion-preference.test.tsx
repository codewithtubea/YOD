import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ReactNode } from "react";

import {
  MotionPreferenceProvider,
  readStoredMotionPreference,
  resolveReduceMotion,
  useMotionPreference,
} from "@/components/motion/motion-preference";
import { MOTION_STORAGE_KEY } from "@/lib/preferences";

function wrapper({ children }: { children: ReactNode }) {
  return <MotionPreferenceProvider>{children}</MotionPreferenceProvider>;
}

describe("resolveReduceMotion", () => {
  it("honours the device setting", () => {
    expect(resolveReduceMotion(true, null)).toBe(true);
    expect(resolveReduceMotion(true, false)).toBe(true);
  });

  it("honours an explicit in-app preference", () => {
    expect(resolveReduceMotion(false, true)).toBe(true);
    expect(resolveReduceMotion(false, false)).toBe(false);
    expect(resolveReduceMotion(false, null)).toBe(false);
  });
});

describe("readStoredMotionPreference", () => {
  it("reads true, false, and invalid values", () => {
    expect(readStoredMotionPreference({ getItem: () => "true" })).toBe(true);
    expect(readStoredMotionPreference({ getItem: () => "false" })).toBe(false);
    expect(readStoredMotionPreference({ getItem: () => "yes" })).toBeNull();
    expect(readStoredMotionPreference(null)).toBeNull();
  });

  it("fails closed when storage throws", () => {
    expect(
      readStoredMotionPreference({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBeNull();
  });
});

describe("useMotionPreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads a stored preference", () => {
    window.localStorage.setItem(MOTION_STORAGE_KEY, "true");

    const { result } = renderHook(() => useMotionPreference(), { wrapper });

    expect(result.current.preference).toBe(true);
    expect(result.current.reduceMotion).toBe(true);
  });

  it("updates the preference and document attribute", () => {
    const { result } = renderHook(() => useMotionPreference(), { wrapper });

    expect(result.current.reduceMotion).toBe(false);

    act(() => result.current.setReduceMotion(true));

    expect(result.current.preference).toBe(true);
    expect(result.current.reduceMotion).toBe(true);
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBe("true");
    expect(document.documentElement.dataset.reduceMotion).toBe("true");
  });

  it("clears an explicit preference", () => {
    const { result } = renderHook(() => useMotionPreference(), { wrapper });

    act(() => result.current.setReduceMotion(true));
    act(() => result.current.clearPreference());

    expect(result.current.preference).toBeNull();
    expect(result.current.reduceMotion).toBe(false);
    expect(window.localStorage.getItem(MOTION_STORAGE_KEY)).toBeNull();
  });
});
