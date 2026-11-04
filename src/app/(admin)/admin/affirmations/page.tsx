import type { Metadata } from "next";

import { AffirmationManager } from "@/components/admin/affirmation-manager";
import { AdminPageHeader } from "@/components/admin/page";
import { getAdminAffirmations } from "@/lib/affirmations/data";
import { getCircleToday } from "@/lib/circle";

export const metadata: Metadata = { title: "Affirmations" };

export default async function AdminAffirmationsPage() {
  const [{ available, items }, today] = await Promise.all([
    getAdminAffirmations(),
    getCircleToday(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Affirmations"
        title="A word for each day."
        description="Write one short line, choose the day it should appear, and let it rest. Members can Amen, save, and share it; nothing is ranked."
      />

      {!available ? (
        <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          Affirmations aren&apos;t available yet. Apply the Phase 5 migration
          and reload.
        </p>
      ) : (
        <AffirmationManager items={items} today={today} />
      )}
    </div>
  );
}
