const FALLBACK_PATH = "/today";

/**
 * Accept only same-origin, root-relative paths.
 * Rejects absolute URLs, protocol-relative URLs, javascript:, and backslash tricks.
 */
export function safeNextPath(
  value: string | null | undefined,
  fallback = FALLBACK_PATH,
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;

  try {
    const base = new URL("http://localhost");
    const target = new URL(value, base);

    if (target.origin !== base.origin) return fallback;
    if (
      target.pathname === "/sign-in" ||
      target.pathname.startsWith("/auth") ||
      target.pathname.startsWith("/setup-check")
    ) {
      return fallback;
    }

    const path = `${target.pathname}${target.search}${target.hash}`;
    return path.length > 1 ? path : fallback;
  } catch {
    return fallback;
  }
}
