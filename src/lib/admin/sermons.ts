export type SermonProvider = "youtube" | "vimeo" | "other";

export type ParsedSermonUrl = {
  provider: SermonProvider;
  providerId: string | null;
  thumbnailUrl: string | null;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
const VIMEO_ID = /^\d{5,12}$/;

export function parseSermonUrl(value: string): ParsedSermonUrl {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return { provider: "other", providerId: null, thumbnailUrl: null };
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (YOUTUBE_ID.test(id)) return youtube(id);
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    const fromQuery = url.searchParams.get("v") ?? "";
    if (YOUTUBE_ID.test(fromQuery)) return youtube(fromQuery);

    const parts = url.pathname.split("/").filter(Boolean);
    if (["shorts", "embed", "live"].includes(parts[0] ?? "")) {
      const id = parts[1] ?? "";
      if (YOUTUBE_ID.test(id)) return youtube(id);
    }
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const candidate = parts[0] === "video" ? parts[1] : parts[0];
    if (candidate && VIMEO_ID.test(candidate)) {
      return { provider: "vimeo", providerId: candidate, thumbnailUrl: null };
    }
  }

  return { provider: "other", providerId: null, thumbnailUrl: null };
}

function youtube(id: string): ParsedSermonUrl {
  return {
    provider: "youtube",
    providerId: id,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

export function sermonThumbnail(
  provider: SermonProvider,
  providerId: string | null,
): string | null {
  if (provider === "youtube" && providerId && YOUTUBE_ID.test(providerId)) {
    return `https://i.ytimg.com/vi/${providerId}/hqdefault.jpg`;
  }
  return null;
}

export function sermonDomain(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}
