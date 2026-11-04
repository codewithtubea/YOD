import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page";
import { SermonManager } from "@/components/admin/sermon-manager";
import { getSermonLinks } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Sermon links" };

export default async function SermonsPage() {
  const { links, available } = await getSermonLinks();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Sermon links"
        title="A small shelf for listening."
        description="Keep a short list of teachings the circle is listening to. Links open in a new tab; the circle never embeds a third-party player."
      />

      {!available ? (
        <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          Sermon links aren&apos;t available yet. Apply the Phase 3B migration and reload.
        </p>
      ) : (
        <SermonManager links={links} />
      )}
    </div>
  );
}
