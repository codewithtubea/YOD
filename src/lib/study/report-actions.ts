"use server";

import { z } from "zod";

import { requireActiveMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/study/types";
import { reportContentSchema } from "@/lib/validation/admin";

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

export async function reportContent(input: {
  targetType: "post" | "reply";
  targetId: string;
  reason: "unkind" | "unsafe" | "private" | "other";
  note?: string;
}): Promise<ActionResult> {
  await requireActiveMember();

  const parsed = reportContentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the report details.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("content_reports").insert({
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    note: parsed.data.note,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        message: "You've already reported this. An admin will see it.",
      };
    }
    if (error.code === "42501") {
      return {
        ok: false,
        message: "You can only report content you can currently see.",
      };
    }
    return {
      ok: false,
      message: "We couldn't send the report just now. Try again.",
    };
  }

  return { ok: true, data: undefined };
}
