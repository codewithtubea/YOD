import type { Metadata } from "next";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/page";
import { ReadingCalendar } from "@/components/admin/reading-calendar";
import { OpenBook } from "@/components/art/open-book";
import { EmptyState } from "@/components/ui/empty-state";
import { BIBLE_BOOKS } from "@/lib/bible";
import { getCircleSettings, getCircleToday } from "@/lib/circle";
import { getAdminPlans } from "@/lib/study/data";
import { ReadingAdmin } from "@/components/study/reading-admin";

export const metadata: Metadata = { title: "Reading plan" };

export default async function ReadingAdminPage() {
  const [today, settings, plans] = await Promise.all([
    getCircleToday(),
    getCircleSettings(),
    getAdminPlans(),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Reading plan"
        title="One chapter, held open."
        description={`Members see today and past readings in ${settings.timezone}. Set the daily chapter, schedule ahead, or replace a date. Important changes are recorded in the audit log.`}
        actions={
          <Link
            href="/today"
            className="inline-flex min-h-11 items-center text-sm font-medium text-link underline-offset-4 hover:underline"
          >
            Open today
          </Link>
        }
      />

      {!plans.available ? (
        <EmptyState
          icon={<OpenBook size={24} />}
          title="The reading plan isn't set up yet"
          description="Apply the Phase 3B migration in Supabase, then return here to schedule the first reading."
        />
      ) : (
        <>
          <ReadingCalendar plans={plans.plans} today={today} />
          <ReadingAdmin
            books={BIBLE_BOOKS.map((book) => ({
              name: book.name,
              chapters: book.chapters,
            }))}
            today={today}
            timezone={settings.timezone}
            initialSource={settings.defaultBibleSource}
            plans={plans.plans}
          />
        </>
      )}
    </div>
  );
}
