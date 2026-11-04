import type { Metadata } from "next";
import Link from "next/link";

import { SettingsPanel } from "@/components/account/settings-panel";
import { getMemberSettings, getMyAccount } from "@/lib/account/data";
import { requireActiveMember } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  await requireActiveMember();
  const [settings, account] = await Promise.all([
    getMemberSettings(),
    getMyAccount(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="type-caption font-semibold text-gold">Settings</p>
        <h1 className="type-display mt-2 text-ink">Make it yours</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
          Comfort, privacy, and the details of your account.
        </p>
      </div>

      <SettingsPanel
        initialSettings={settings}
        email={account.account?.email ?? ""}
      />

      <p className="text-xs leading-relaxed text-ink-soft">
        Need a hand? Visit{" "}
        <Link
          href="/help"
          className="text-link underline-offset-4 hover:underline"
        >
          Help
        </Link>{" "}
        or{" "}
        <Link
          href="/privacy"
          className="text-link underline-offset-4 hover:underline"
        >
          Privacy
        </Link>
        .
      </p>
    </div>
  );
}
