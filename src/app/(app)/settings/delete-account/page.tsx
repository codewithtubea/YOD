import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { getMyAccount } from "@/lib/account/data";
import { requireActiveMember } from "@/lib/auth";
import { DeleteAccountFlow } from "./delete-account-flow";

export const metadata: Metadata = {
  title: "Delete your account",
};

export default async function DeleteAccountPage() {
  await requireActiveMember();
  const result = await getMyAccount();

  if (!result.available) {
    return (
      <Card>
        <h1 className="type-heading text-ink">Account deletion is not ready.</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Apply the Phase 5B migration, then try again.
        </p>
      </Card>
    );
  }

  if (!result.account) redirect("/onboarding");

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="text-xs font-medium text-link underline-offset-4 hover:underline"
        >
          Settings
        </Link>
        <h1 className="type-display mt-2 text-ink">Leave the circle</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
          Take your time. You can download your data before anything changes.
        </p>
      </div>

      <DeleteAccountFlow email={result.account.email} />
    </div>
  );
}
