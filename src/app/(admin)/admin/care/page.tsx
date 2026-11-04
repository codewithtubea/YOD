import type { Metadata } from "next";

import { CareManager } from "@/components/admin/care-manager";
import { AdminPageHeader } from "@/components/admin/page";
import {
  getAdminCareMembers,
  getAdminCareSummary,
  getAdminUnansweredThoughts,
} from "@/lib/admin/data";

export const metadata: Metadata = { title: "Care" };

export default async function AdminCarePage() {
  const [summary, members, thoughts] = await Promise.all([
    getAdminCareSummary(),
    getAdminCareMembers(),
    getAdminUnansweredThoughts(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Care"
        title="Notice, without watching."
        description="A weekly word, a private note, and a gentle nudge. This view is for care, never for ranking or public display."
      />

      <CareManager
        summary={summary.summary}
        members={members.members}
        thoughts={thoughts.thoughts}
        available={summary.available && members.available && thoughts.available}
      />
    </div>
  );
}
