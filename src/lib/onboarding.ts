export const ONBOARDING_STEPS = [
  "welcome",
  "profile",
  "how",
  "install",
  "blessing",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_PROGRESS = 4;

export function stepIndex(step: OnboardingStep) {
  return ONBOARDING_STEPS.indexOf(step);
}

export function stepFromIndex(index: number): OnboardingStep {
  return ONBOARDING_STEPS[Math.max(0, Math.min(index, ONBOARDING_STEPS.length - 1))];
}

export function canResumeAt(index: number) {
  return Number.isInteger(index) && index >= 0 && index < ONBOARDING_PROGRESS;
}

export function parseResumeStep(value: string | null) {
  if (value === null || value.trim() === "") return 0;
  const parsed = Number(value);
  return canResumeAt(parsed) ? parsed : 0;
}

export function resumeStorageKey(userId: string) {
  return `yod-circle:onboarding:${userId}`;
}

export type Platform = "ios" | "android" | "other";

export function detectPlatform(userAgent: string): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}

export function isMessagingBrowser(userAgent: string) {
  return /WhatsApp|FBAN|FBAV|Instagram|Line\//i.test(userAgent);
}
