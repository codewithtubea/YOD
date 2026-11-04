"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAuthContext, requireActiveMember } from "@/lib/auth";
import {
  detectImageType,
  imageExtension,
  MAX_IMAGE_BYTES,
} from "@/lib/affirmations/images";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/study/types";
import {
  affirmationActionSchema,
  archiveAffirmationSchema,
  saveAffirmationSchema,
} from "@/lib/validation/affirmations";

const BUCKET = "affirmation-images";

type AdminGate =
  | { ok: true; userId: string }
  | { ok: false; message: string };

async function adminGate(): Promise<AdminGate> {
  const context = await getAuthContext();

  if (!context) {
    return { ok: false, message: "Your session has ended. Sign in again." };
  }
  if (context.membership?.status !== "active") {
    return { ok: false, message: "This account is not active." };
  }
  if (context.membership.role !== "admin") {
    return { ok: false, message: "Administrator access is required." };
  }

  return { ok: true, userId: context.userId };
}

function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] = [...(result[key] ?? []), issue.message];
  }
  return result;
}

function databaseMessage(error: { code?: string; message?: string } | null) {
  if (!error) return "We couldn't save this just now. Try again.";
  if (error.code === "PGRST202" || error.code === "PGRST205") {
    return "Affirmations are not set up yet. Apply the Phase 5 migration.";
  }
  if (error.code === "42501") {
    return "You don't have permission to do that.";
  }
  if (error.code === "23505") {
    return "Another affirmation is already set for that day.";
  }
  if (error.code === "23514" || error.code === "23503") {
    return "That change didn't pass the circle's safety checks.";
  }
  if (error.code === "P0001" && error.message) return error.message;
  return "We couldn't save this just now. Try again.";
}

function refresh() {
  revalidatePath("/today");
  revalidatePath("/affirmation");
  revalidatePath("/admin/affirmations");
  revalidatePath("/admin/audit");
}

export async function saveAffirmation(input: unknown): Promise<
  ActionResult<{ id: string }>
> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = saveAffirmationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Check the affirmation and try again.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const value = parsed.data;
  const imagePath = value.imagePath;
  const payload = {
    body: value.body,
    scripture_ref: value.scriptureRef,
    image_path: imagePath,
    image_alt: imagePath ? value.imageAlt : null,
    status: value.status,
    publish_date: value.status === "draft" ? null : value.publishDate,
    archived_at:
      value.status === "archived" ? new Date().toISOString() : null,
  };

  const supabase = await createClient();
  let id = value.id;
  let oldImagePath: string | null = null;

  if (id) {
    const { data: existing, error: readError } = await supabase
      .from("affirmations")
      .select("image_path")
      .eq("id", id)
      .maybeSingle();

    if (readError || !existing) {
      return { ok: false, message: databaseMessage(readError) };
    }

    oldImagePath = (existing as { image_path: string | null }).image_path;

    const { error } = await supabase
      .from("affirmations")
      .update(payload)
      .eq("id", id);

    if (error) return { ok: false, message: databaseMessage(error) };
  } else {
    const { data, error } = await supabase
      .from("affirmations")
      .insert(payload)
      .select("id")
      .single();

    if (error || !data) {
      return { ok: false, message: databaseMessage(error) };
    }
    id = (data as { id: string }).id;
  }

  if (oldImagePath && oldImagePath !== imagePath) {
    await supabase.storage.from(BUCKET).remove([oldImagePath]);
  }

  refresh();
  return { ok: true, data: { id } };
}

export async function archiveAffirmation(input: {
  id: string;
}): Promise<ActionResult> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const parsed = archiveAffirmationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "That affirmation could not be found." };
  }

  const supabase = await createClient();
  const { data: existing, error: readError } = await supabase
    .from("affirmations")
    .select("status")
    .eq("id", parsed.data.id)
    .maybeSingle();

  if (readError || !existing) {
    return { ok: false, message: databaseMessage(readError) };
  }

  const status = (existing as { status: string }).status;
  if (status === "archived") return { ok: true, data: undefined };
  if (status === "draft") {
    return {
      ok: false,
      message: "Schedule this draft before archiving it.",
    };
  }

  const { error } = await supabase
    .from("affirmations")
    .update({ status: "archived" })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, message: databaseMessage(error) };

  refresh();
  return { ok: true, data: undefined };
}

export async function uploadAffirmationImage(
  formData: FormData,
): Promise<ActionResult<{ path: string }>> {
  const gate = await adminGate();
  if (!gate.ok) return gate;

  const file = formData.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Choose an image first." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "Keep images under 2 MB." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);

  if (!type) {
    return { ok: false, message: "Use a JPG, PNG, or WebP image." };
  }

  const path = `${gate.userId}/${crypto.randomUUID()}.${imageExtension(type)}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: type,
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    return {
      ok: false,
      message: "That image could not be uploaded. Try a smaller image.",
    };
  }

  return { ok: true, data: { path } };
}

export async function toggleAffirmationAmen(input: {
  affirmationId: string;
}): Promise<
  ActionResult<{ amen: boolean; amenCount: number }>
> {
  await requireActiveMember();
  const parsed = affirmationActionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "That affirmation could not be found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_affirmation_amen", {
    p_affirmation_id: parsed.data.affirmationId,
  });

  const row = ((data ?? []) as unknown as {
    amen: boolean;
    amen_count: number | string;
  }[])[0];

  if (error || !row) {
    return { ok: false, message: databaseMessage(error) };
  }

  refresh();
  return {
    ok: true,
    data: {
      amen: Boolean(row.amen),
      amenCount: Number(row.amen_count) || 0,
    },
  };
}

export async function toggleAffirmationFavorite(input: {
  affirmationId: string;
}): Promise<ActionResult<{ saved: boolean }>> {
  await requireActiveMember();
  const parsed = affirmationActionSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, message: "That affirmation could not be found." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("toggle_affirmation_favorite", {
    p_affirmation_id: parsed.data.affirmationId,
  });

  const row = ((data ?? []) as unknown as { saved: boolean }[])[0];

  if (error || !row) {
    return { ok: false, message: databaseMessage(error) };
  }

  refresh();
  return { ok: true, data: { saved: Boolean(row.saved) } };
}
