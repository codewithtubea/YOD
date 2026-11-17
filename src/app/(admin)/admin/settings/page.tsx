import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page";
import { AdminPasswordForm } from "@/components/admin/password-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { getTimeZoneOptions } from "@/lib/admin/timezones";
import { getCircleSettings, getCircleToday } from "@/lib/circle";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [settings, today, site] = await Promise.all([
    getCircleSettings(),
    getCircleToday(),
    getSiteUrl(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Settings"
        title="The shape of the circle."
        description="The name, the day boundary, and the words you use to welcome someone. Keep it simple; these are the settings members feel without seeing."
      />

      {!site.ok ? (
        <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          Invite previews aren&apos;t available on this deployment. Set
          <code className="mx-1 font-mono">NEXT_PUBLIC_SITE_URL</code>
          to the circle&apos;s real address.
        </p>
      ) : (
        <SettingsForm
          settings={settings}
          timezones={getTimeZoneOptions(settings.timezone)}
          today={today}
          siteUrl={site.url}
        />
      )}

      <AdminPasswordForm />
    </div>
  );
}
