"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveMember } from "@/lib/auth";
import type {
  CheckInActionResult,
  CheckInView,
} from "@/lib/check-in/types";
import { createClient } from "@/lib/supabase/server";
import {
  saveCheckInSchema,
  sendEncouragementSchema,
} from "@/lib/validation/check-in";
import type { CheckInMood } from "@/lib/validation/check-in";

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

function checkInMessage(error: { code?: string; message?: string } | null) {
  if (!error) return "We couldn't save this just now. Please try again.";
  if (error.code === "PGRST202" || error.code === "PGRST205") {
    return "The check-in isn't ready yet. Apply the Phase 6 migration first.";
  }
  if (error.code === "42501") {
    return "You don't have permission to do that.";
  }
  if (error.code === "P0001" && error.message) {
    return error.message;
  }
  if (error.code === "22023" && error.message) {
    return error.message;
  }
  return "We couldn't save this just now. Please try again.";
}

export async function saveCheckIn(input: {
  mood: CheckInMood;
  note: string | null;
}): Promise<CheckInActionResult<CheckInView>> {
  await requireActiveMember();
  const parsed = saveCheckInSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your check-in and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_my_check_in", {
    p_mood: parsed.data.mood,
    p_note: parsed.data.note,
  });

  const row = ((data ?? []) as unknown as {
    week_start: string;
    mood: CheckInMood;
    note: string | null;
    updated_at: string | null;
    checked_in: boolean;
  }[])[0];

  if (error || !row) {
    return { ok: false, message: checkInMessage(error) };
  }

  revalidatePath("/check-in");
  revalidatePath("/admin/care");

  return {
    ok: true,
    data: {
      weekStart: row.week_start,
      mood: row.mood,
      note: row.note,
      updatedAt: row.updated_at,
      checkedIn: Boolean(row.checked_in),
    },
  };
}

export async function sendEncouragement(input: {
  toUserId: string;
  body: string;
}): Promise<CheckInActionResult<{ id: string }>> {
  await requireActiveMember();
  const parsed = sendEncouragementSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your note and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_encouragement", {
    p_to: parsed.data.toUserId,
    p_body: parsed.data.body,
  });

  if (error || !data) {
    return { ok: false, message: checkInMessage(error) };
  }

  revalidatePath("/check-in");

  return { ok: true, data: { id: String(data) } };
}

export async function markEncouragementsRead(): Promise<
  CheckInActionResult<{ count: number }>
> {
  await requireActiveMember();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mark_encouragements_read");

  if (error) {
    return { ok: false, message: checkInMessage(error) };
  }

  revalidatePath("/check-in");

  return { ok: true, data: { count: Number(data) || 0 } };
}
