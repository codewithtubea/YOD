"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireActiveMember } from "@/lib/auth";
import { parsePrayerCursor } from "@/lib/prayer/cursor";
import { getPrayerWall } from "@/lib/prayer/data";
import type {
  PrayerActionResult,
  PrayerView,
} from "@/lib/prayer/types";
import {
  addPrayerUpdateSchema,
  createPrayerSchema,
  prayerActionSchema,
} from "@/lib/validation/prayer";
import { createClient } from "@/lib/supabase/server";

function refresh() {
  revalidatePath("/prayer");
}

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

function prayerMessage(error: { code?: string; message?: string } | null) {
  if (!error) return "We couldn't save this just now. Please try again.";
  if (error.code === "PGRST205" || error.code === "PGRST202") {
    return "The prayer wall isn't ready yet. Apply the prayer migration first.";
  }
  if (error.code === "42501") {
    return "You don't have permission to do that.";
  }
  if (error.code === "22P02") {
    return "That prayer could not be found.";
  }
  if (error.code === "23514" || error.code === "23503") {
    return "That content didn't pass the circle's safety checks.";
  }
  if (error.code === "P0001" && error.message) {
    return error.message;
  }
  return "We couldn't save this just now. Please try again.";
}

export async function createPrayer(input: {
  body: string;
}): Promise<PrayerActionResult<{ id: string }>> {
  await requireActiveMember();
  const parsed = createPrayerSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your prayer and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_prayer", {
    p_body: parsed.data.body,
  });

  if (error || !data) {
    return { ok: false, message: prayerMessage(error) };
  }

  refresh();
  return { ok: true, data: { id: String(data) } };
}

export async function loadMorePrayers(input: {
  cursor: string;
}): Promise<
  PrayerActionResult<{
    prayers: PrayerView[];
    hasMore: boolean;
    nextCursor: string | null;
  }>
> {
  await requireActiveMember();
  const cursor = parsePrayerCursor(input.cursor);

  if (!cursor) {
    return { ok: false, message: "That page could not be loaded." };
  }

  const page = await getPrayerWall({ cursor });

  if (!page.available) {
    return { ok: false, message: "The prayer wall isn't ready yet." };
  }

  return {
    ok: true,
    data: {
      prayers: page.prayers,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
    },
  };
}

export async function togglePrayerPrayed(input: {
  prayerId: string;
}): Promise<
  PrayerActionResult<{ prayed: boolean; prayedCount: number }>
> {
  await requireActiveMember();
  const parsed = prayerActionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "That prayer could not be found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_prayer_prayed", {
    p_prayer_id: parsed.data.prayerId,
  });

  const row = ((data ?? []) as unknown as {
    prayed: boolean;
    prayed_count: number | string;
  }[])[0];

  if (error || !row) {
    return { ok: false, message: prayerMessage(error) };
  }

  refresh();
  return {
    ok: true,
    data: {
      prayed: Boolean(row.prayed),
      prayedCount: Number(row.prayed_count) || 0,
    },
  };
}

export async function addPrayerUpdate(input: {
  prayerId: string;
  body: string;
}): Promise<PrayerActionResult<{ id: string }>> {
  await requireActiveMember();
  const parsed = addPrayerUpdateSchema.safeParse(input);

  if (!parsed.success) {
    return {
      ok: false,
      message: "Check your update and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("add_prayer_update", {
    p_prayer_id: parsed.data.prayerId,
    p_body: parsed.data.body,
  });

  if (error || !data) {
    return { ok: false, message: prayerMessage(error) };
  }

  refresh();
  return { ok: true, data: { id: String(data) } };
}

export async function markPrayerAnswered(input: {
  prayerId: string;
}): Promise<PrayerActionResult> {
  await requireActiveMember();
  const parsed = prayerActionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "That prayer could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_prayer_answered", {
    p_prayer_id: parsed.data.prayerId,
  });

  if (error) return { ok: false, message: prayerMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function removePrayer(input: {
  prayerId: string;
}): Promise<PrayerActionResult> {
  await requireActiveMember();
  const parsed = prayerActionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "That prayer could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_prayer", {
    p_prayer_id: parsed.data.prayerId,
  });

  if (error) return { ok: false, message: prayerMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}
