import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/page";
import { QuestionManager } from "@/components/admin/question-manager";
import { getAdminQuestions } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Questions" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function QuestionsAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = first(params.filter);
  const filter = raw === "answered" || raw === "all" ? raw : "open";
  const { questions, available } = await getAdminQuestions(filter);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Questions"
        title="Questions, held with care."
        description="See what the circle is asking. Reply in the discussion, then mark a question answered so the person knows it was not missed."
      />

      {!available ? (
        <p className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          Questions aren&apos;t available yet. Apply the Phase 3B migration and reload.
        </p>
      ) : (
        <QuestionManager questions={questions} filter={filter} />
      )}
    </div>
  );
}
