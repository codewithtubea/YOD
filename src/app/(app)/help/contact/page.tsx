import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { requireActiveMember } from "@/lib/auth";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact the admins",
};

export default async function ContactPage() {
  await requireActiveMember();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/help"
          className="text-xs font-medium text-link underline-offset-4 hover:underline"
        >
          Help
        </Link>
        <h1 className="type-display mt-2 text-ink">Contact the admins</h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
          A private note for account, privacy, or content concerns. It goes only
          to the admins.
        </p>
      </div>

      <Card>
        <ContactForm />
      </Card>

      <p className="text-xs leading-relaxed text-ink-soft">
        For urgent safety concerns outside the app, contact local emergency
        services. This form is not monitored around the clock.
      </p>
    </div>
  );
}
