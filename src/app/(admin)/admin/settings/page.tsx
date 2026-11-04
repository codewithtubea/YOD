import type { Metadata } from "next";
import { headers } from "next/headers";

import { AdminPageHeader } from "@/components/admin/page";
import { AdminPasswordForm } from "@/components/admin/password-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { getTimeZoneOptions } from "@/lib/admin/timezones";
import { getCircleSettings, getCircleToday } from "@/lib/circle";

export const metadata: Metadata = { title: "Settings" };

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export default async function SettingsPage() {
  const [settings, today, url] = await Promise.all([
    getCircleSettings(),
    getCircleToday(),
    siteUrl(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Settings"
        title="The shape of the circle."
        description="The name, the day boundary, and the words you use to welcome someone. Keep it simple; these are the settings members feel without seeing."
      />

      <SettingsForm
        settings={settings}
        timezones={getTimeZoneOptions(settings.timezone)}
        today={today}
        siteUrl={url}
      />

      <AdminPasswordForm />
    </div>
  );
}
