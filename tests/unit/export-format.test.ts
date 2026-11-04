import { describe, expect, it } from "vitest";

import { exportToMarkdown } from "@/lib/account/export-format";

describe("account export markdown", () => {
  it("includes check-ins and encouragement notes", () => {
    const markdown = exportToMarkdown({
      profile: { display_name: "Ama", email: "ama@example.com" },
      settings: { notify_encouragements: false },
      check_ins: [
        {
          week_start: "2026-11-02",
          mood: "heavy",
          note: "Please pray for my family.",
          created_at: "2026-11-03T08:00:00Z",
        },
      ],
      encouragements_sent: [
        {
          body: "You are not alone.",
          to_user_id: "member-2",
          created_at: "2026-11-03T09:00:00Z",
        },
      ],
      encouragements_received: [
        {
          body: "Held with you.",
          from_user_id: "member-3",
          created_at: "2026-11-03T10:00:00Z",
        },
      ],
    });

    expect(markdown).toContain("Encouragement notices: off");
    expect(markdown).toContain("Week of 2026-11-02 · heavy");
    expect(markdown).toContain("Please pray for my family.");
    expect(markdown).toContain("You are not alone.");
    expect(markdown).toContain("Held with you.");
  });
});
