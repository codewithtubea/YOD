import type { Metadata } from "next";

import { AnnouncementManager } from "@/components/admin/announcement-manager";
import { AdminPageHeader } from "@/components/admin/page";
import { getAdminAnnouncements } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  const { announcements, available } = await getAdminAnnouncements();

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Announcements"
        title="One notice at a time."
        description="A live announcement sits quietly at the top of Today. Publishing a new one archives the last, so the circle is never met with a wall of notices."
      />

      {!available ? (
        <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          Announcements aren&apos;t available yet. Apply the Phase 3B migration and reload.
        </p>
      ) : (
        <AnnouncementManager announcements={announcements} />
      )}
    </div>
  );
}
