import type { Metadata } from "next";

import { ConcernsManager } from "@/components/admin/concerns-manager";
import { ModerationManager } from "@/components/admin/moderation-manager";
import { AdminPageHeader } from "@/components/admin/page";
import {
  getAdminConcerns,
  getAdminReports,
  getHiddenContent,
} from "@/lib/admin/data";

export const metadata: Metadata = { title: "Moderation" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = first(params.status);
  const filter = raw === "resolved" || raw === "all" ? raw : "pending";

  const [{ reports, available }, hidden, concerns] = await Promise.all([
    getAdminReports(filter),
    getHiddenContent(),
    getAdminConcerns(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Moderation"
        title="Care, not surveillance."
        description="Reports are a quiet signal from members. Read the context, hide only what needs hiding, and write a short reason for the record."
      />

      {!available ? (
        <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          Moderation isn&apos;t available yet. Apply the Phase 3B migration and reload.
        </p>
      ) : (
        <ModerationManager reports={reports} hidden={hidden.items} filter={filter} />
      )}

      <ConcernsManager
        concerns={concerns.concerns}
        available={concerns.available}
      />
    </div>
  );
}
