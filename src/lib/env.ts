export type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

export type SupabaseEnvResult =
  | { ok: true; value: SupabaseEnv }
  | { ok: false; missing: string[] };

const URL_VAR = "NEXT_PUBLIC_SUPABASE_URL";
const KEY_VAR = "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY";

export function readSupabaseEnv(): SupabaseEnvResult {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const missing: string[] = [];

  if (!url) missing.push(URL_VAR);
  if (!publishableKey) missing.push(KEY_VAR);

  if (!url || !publishableKey) {
    return { ok: false, missing };
  }

  return { ok: true, value: { url, publishableKey } };
}

export function getSupabaseEnv(): SupabaseEnv {
  const result = readSupabaseEnv();

  if (!result.ok) {
    throw new Error(
      `Missing Supabase environment variable(s): ${result.missing.join(
        ", ",
      )}. Add them to .env.local — see .env.example.`,
    );
  }

  return result.value;
}
