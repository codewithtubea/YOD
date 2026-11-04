import { describe, expect, it } from "vitest";

import {
  ONBOARDING_PROGRESS,
  ONBOARDING_STEPS,
  canResumeAt,
  detectPlatform,
  isMessagingBrowser,
  parseResumeStep,
  resumeStorageKey,
  stepFromIndex,
  stepIndex,
} from "@/lib/onboarding";

describe("onboarding state", () => {
  it("uses four progress steps before the blessing", () => {
    expect(ONBOARDING_PROGRESS).toBe(4);
    expect(ONBOARDING_STEPS.at(-1)).toBe("blessing");
    expect(stepIndex("blessing")).toBe(4);
  });

  it("resumes only inside the progress steps", () => {
    expect(parseResumeStep(null)).toBe(0);
    expect(parseResumeStep("3")).toBe(3);
    expect(parseResumeStep("4")).toBe(0);
    expect(parseResumeStep("nope")).toBe(0);
    expect(canResumeAt(0)).toBe(true);
    expect(canResumeAt(4)).toBe(false);
    expect(stepFromIndex(-2)).toBe("welcome");
    expect(stepFromIndex(99)).toBe("blessing");
  });

  it("scopes resume storage to the member", () => {
    expect(resumeStorageKey("abc")).toBe("yod-circle:onboarding:abc");
  });

  it("detects phone platforms and messaging browsers", () => {
    expect(detectPlatform("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")).toBe(
      "ios",
    );
    expect(detectPlatform("Mozilla/5.0 (Linux; Android 14)")).toBe("android");
    expect(detectPlatform("Mozilla/5.0 (Macintosh)")).toBe("other");
    expect(isMessagingBrowser("WhatsApp/2.23")).toBe(true);
    expect(isMessagingBrowser("Mozilla/5.0 Safari")).toBe(false);
  });
});
