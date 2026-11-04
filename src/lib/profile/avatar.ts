import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_SIGNED_SECONDS = 60 * 10;

type Client = Pick<SupabaseClient, "storage">;

export async function signedAvatarUrl(
  supabase: Client,
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(path, AVATAR_SIGNED_SECONDS);

  return error ? null : data.signedUrl;
}

export async function signedAvatarUrls(
  supabase: Client,
  paths: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = Array.from(
    new Set(paths.filter((path): path is string => Boolean(path))),
  );
  const result = new Map<string, string>();
  if (unique.length === 0) return result;

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrls(unique, AVATAR_SIGNED_SECONDS);

  if (error) return result;

  for (const entry of data ?? []) {
    if (entry.path && entry.signedUrl) {
      result.set(entry.path, entry.signedUrl);
    }
  }

  return result;
}
