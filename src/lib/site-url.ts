import { headers } from "next/headers";

const VERCEL_HOST = /(^|\.)vercel\.app$/i;

export type SiteUrlResult =
  | { ok: true; url: string }
  | { ok: false; reason: "preview-host" };

/**
 * Canonical origin for links that leave the app (auth emails, invite links).
 * A Vercel preview host is never used: Supabase email links sent to a preview
 * deployment land on Vercel's access gate instead of YOD Circle.
 */
export async function getSiteUrl(): Promise<SiteUrlResult> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;

  if (configured) {
    return { ok: true, url: configured.replace(/\/+$/, "") };
  }

  const headerList = await headers();
  const rawHost = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const host = (rawHost ?? "").split(",")[0]?.trim() ?? "";

  if (!host) {
    return { ok: true, url: "http://localhost:3000" };
  }

  if (VERCEL_HOST.test(host)) {
    return { ok: false, reason: "preview-host" };
  }

  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return { ok: true, url: `${proto}://${host}` };
}
