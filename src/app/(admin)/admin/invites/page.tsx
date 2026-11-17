import type { Metadata } from "next";

import { InviteManager } from "@/components/admin/invite-manager";
import { AdminPageHeader } from "@/components/admin/page";
import { getAdminInvites } from "@/lib/admin/data";
import { getCircleSettings } from "@/lib/circle";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Invites" };

export default async function InvitesPage() {
  const [{ invites, available }, settings, site] = await Promise.all([
    getAdminInvites(),
    getCircleSettings(),
    getSiteUrl(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Invites"
        title="Open the door, personally."
        description="Anyone can ask to join from the landing page and wait for approval. An invite pre-approves one email so it skips the waiting room. Creating an invite does not send an email; copy the short message and share it yourself."
      />

      {!site.ok ? (
        <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          Invite links aren&apos;t available on this deployment. Ask the admin to set
          <code className="mx-1 font-mono">NEXT_PUBLIC_SITE_URL</code>
          to the circle&apos;s real address.
        </p>
      ) : !available ? (
        <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          The invite list isn&apos;t available. Apply the Phase 3B migration, then
          reload this page.
        </p>
      ) : (
        <InviteManager
          invites={invites}
          circleName={settings.name}
          template={settings.inviteMessageTemplate}
          siteUrl={site.url}
        />
      )}
    </div>
  );
}
