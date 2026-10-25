import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { readSupabaseEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  const env = readSupabaseEnv();

  if (!env.ok) {
    // Let the app render so /setup-check can explain what is missing.
    return {
      response: NextResponse.next({ request }),
      claims: null,
    };
  }

  const { url, publishableKey } = env.value;
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );

        supabaseResponse = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );

        for (const [key, value] of Object.entries(headers)) {
          supabaseResponse.headers.set(key, value);
        }
      },
    },
  });

  // Verify the token (not just read the cookie) and refresh it if needed.
  const { data } = await supabase.auth.getClaims();

  return {
    response: supabaseResponse,
    claims: data?.claims ?? null,
  };
}
