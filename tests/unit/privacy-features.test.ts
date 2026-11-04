import { describe, expect, it } from "vitest";

import { PRIVACY_FEATURES, privacyFeature } from "@/lib/account/privacy";
import { FEATURE_MODULES } from "@/lib/features";

const required = [
  "profile",
  "reflections",
  "questions",
  "amens",
  "reading",
  "prayer",
  "anonymous-prayer",
  "affirmations",
  "check-in",
  "encouragement",
  "settings",
  "concerns",
  "email",
  "admin-only",
];

describe("privacy rows", () => {
  it("covers every shipped feature module", () => {
    for (const feature of FEATURE_MODULES) {
      expect(privacyFeature(feature.privacyId), feature.id).not.toBeNull();
    }
  });

  it("keeps every required row", () => {
    for (const id of required) {
      expect(privacyFeature(id), id).not.toBeNull();
    }
  });

  it("has unique row and module ids", () => {
    const rows = PRIVACY_FEATURES.map((feature) => feature.id);
    expect(new Set(rows).size).toBe(rows.length);

    const modules = FEATURE_MODULES.map((feature) => feature.id);
    expect(new Set(modules).size).toBe(modules.length);
  });

  it("explains the anonymous prayer admin path", () => {
    const row = privacyFeature("anonymous-prayer");
    expect(row?.description).toMatch(/admin/i);
    expect(row?.description).toMatch(/audit/i);
  });
});
