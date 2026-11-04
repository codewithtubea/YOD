import type { Metadata } from "next";
import { headers } from "next/headers";

import { InviteManager } from "@/components/admin/invite-manager";
import { AdminPageHeader } from "@/components/admin/page";
import { getAdminInvites } from "@/lib/admin/data";
import { getCircleSettings } from "@/lib/circle";

export const metadata: Metadata = { title: "Invites" };

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export default async function InvitesPage() {
  const [{ invites, available }, settings, url] = await Promise.all([
    getAdminInvites(),
    getCircleSettings(),
    siteUrl(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Invites"
        title="Open the door, personally."
        description="Anyone can ask to join from the landing page and wait for approval. An invite pre-approves one email so it skips the waiting room. Creating an invite does not send an email; copy the short message and share it yourself."
      />

      {!available ? (
        <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          The invite list isn&apos;t available. Apply the Phase 3B migration, then
          reload this page.
        </p>
      ) : (
        <InviteManager
          invites={invites}
          circleName={settings.name}
          template={settings.inviteMessageTemplate}
          siteUrl={url}
        />
      )}
    </div>
  );
}
