import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireActiveMember } from "@/lib/auth";
import { getMyAccount } from "@/lib/account/data";
import { getCircleSettings } from "@/lib/circle";
import { Card } from "@/components/ui/card";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = {
  title: "Welcome",
};

export default async function OnboardingPage() {
  await requireActiveMember();
  const result = await getMyAccount();

  if (!result.available) {
    return (
      <Card>
        <h1 className="type-heading text-ink">The circle is not ready yet.</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Your profile could not be loaded. Ask an admin to apply the latest
          database migration, then try again.
        </p>
      </Card>
    );
  }

  if (!result.account) {
    return (
      <Card>
        <h1 className="type-heading text-ink">Your profile is not ready.</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Ask an admin to check your invitation and profile.
        </p>
      </Card>
    );
  }

  if (result.account.onboardedAt) redirect("/today");

  const circle = await getCircleSettings();

  return (
    <OnboardingFlow account={result.account} circleName={circle.name} />
  );
}
