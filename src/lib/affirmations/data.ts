import { getCircleToday } from "@/lib/circle";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminAffirmation,
  AffirmationEngagement,
  AffirmationItem,
  AffirmationStatus,
  AffirmationView,
} from "./types";

const BUCKET = "affirmation-images";
const ROW =
  "id, body, scripture_ref, image_path, image_alt, status, publish_date, archived_at, created_at";
const SIGNED_URL_SECONDS = 60 * 10;

type Supabase = Awaited<ReturnType<typeof createClient>>;

type AffirmationRow = {
  id: string;
  body: string;
  scripture_ref: string | null;
  image_path: string | null;
  image_alt: string | null;
  status: AffirmationStatus;
  publish_date: string | null;
  archived_at: string | null;
  created_at: string;
};

type EngagementRow = {
  affirmation_id: string;
  amen_count: number | string;
  viewer_amen: boolean;
  viewer_saved: boolean;
};

function emptyEngagement(): AffirmationEngagement {
  return { amenCount: 0, viewerAmen: false, viewerSaved: false };
}

async function getEngagement(
  supabase: Supabase,
  ids: string[],
): Promise<Map<string, AffirmationEngagement>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_affirmation_engagement", {
    p_ids: ids,
  });

  if (error) return new Map();

  const map = new Map<string, AffirmationEngagement>();
  for (const row of (data ?? []) as unknown as EngagementRow[]) {
    map.set(row.affirmation_id, {
      amenCount: Number(row.amen_count) || 0,
      viewerAmen: Boolean(row.viewer_amen),
      viewerSaved: Boolean(row.viewer_saved),
    });
  }
  return map;
}

async function signedImage(supabase: Supabase, path: string | null) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);

  return error ? null : data.signedUrl;
}

function toView(
  row: AffirmationRow,
  engagement: AffirmationEngagement | undefined,
  imageUrl: string | null,
): AffirmationView {
  const state = engagement ?? emptyEngagement();
  return {
    id: row.id,
    body: row.body,
    scriptureRef: row.scripture_ref,
    imageUrl,
    imageAlt: row.image_alt,
    publishDate: row.publish_date ?? "",
    status: row.status,
    amenCount: state.amenCount,
    viewerAmen: state.viewerAmen,
    viewerSaved: state.viewerSaved,
  };
}

function toItem(
  row: AffirmationRow,
  engagement: AffirmationEngagement | undefined,
): AffirmationItem {
  const state = engagement ?? emptyEngagement();
  return {
    id: row.id,
    body: row.body,
    scriptureRef: row.scripture_ref,
    publishDate: row.publish_date ?? "",
    amenCount: state.amenCount,
    viewerSaved: state.viewerSaved,
  };
}

export async function getAffirmationByDate(date: string): Promise<{
  available: boolean;
  affirmation: AffirmationView | null;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("affirmations")
      .select(ROW)
      .eq("publish_date", date)
      .in("status", ["scheduled", "archived"])
      .maybeSingle();

    if (error) return { available: false, affirmation: null };
    if (!data) return { available: true, affirmation: null };

    const row = data as unknown as AffirmationRow;
    const [engagement, imageUrl] = await Promise.all([
      getEngagement(supabase, [row.id]),
      signedImage(supabase, row.image_path),
    ]);

    return {
      available: true,
      affirmation: toView(row, engagement.get(row.id), imageUrl),
    };
  } catch {
    return { available: false, affirmation: null };
  }
}

export async function getArchiveAffirmations(limit = 120): Promise<{
  available: boolean;
  items: AffirmationItem[];
}> {
  try {
    const today = await getCircleToday();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("affirmations")
      .select(ROW)
      .in("status", ["scheduled", "archived"])
      .not("publish_date", "is", null)
      .lte("publish_date", today)
      .order("publish_date", { ascending: false })
      .limit(limit);

    if (error) return { available: false, items: [] };

    const rows = (data ?? []) as unknown as AffirmationRow[];
    const engagement = await getEngagement(
      supabase,
      rows.map((row) => row.id),
    );

    return {
      available: true,
      items: rows.map((row) => toItem(row, engagement.get(row.id))),
    };
  } catch {
    return { available: false, items: [] };
  }
}

export async function getSavedAffirmations(limit = 100): Promise<{
  available: boolean;
  items: AffirmationItem[];
}> {
  try {
    const supabase = await createClient();
    const { data: favorites, error } = await supabase
      .from("affirmation_favorites")
      .select("affirmation_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) return { available: false, items: [] };

    const ids = ((favorites ?? []) as unknown as { affirmation_id: string }[]).map(
      (row) => row.affirmation_id,
    );
    if (ids.length === 0) return { available: true, items: [] };

    const { data, error: rowsError } = await supabase
      .from("affirmations")
      .select(ROW)
      .in("id", ids);

    if (rowsError) return { available: false, items: [] };

    const rows = (data ?? []) as unknown as AffirmationRow[];
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = ids
      .map((id) => byId.get(id))
      .filter((row): row is AffirmationRow => Boolean(row));

    const engagement = await getEngagement(supabase, ids);

    return {
      available: true,
      items: ordered.map((row) => ({
        ...toItem(row, engagement.get(row.id)),
        viewerSaved: true,
      })),
    };
  } catch {
    return { available: false, items: [] };
  }
}

export async function getAdminAffirmations(): Promise<{
  available: boolean;
  items: AdminAffirmation[];
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("affirmations")
      .select(ROW)
      .order("publish_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) return { available: false, items: [] };

    const rows = (data ?? []) as unknown as AffirmationRow[];
    const paths = rows
      .map((row) => row.image_path)
      .filter((path): path is string => Boolean(path));

    const urls = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_URL_SECONDS);
      for (const entry of signed ?? []) {
        if (entry.signedUrl && entry.path) {
          urls.set(entry.path, entry.signedUrl);
        }
      }
    }

    return {
      available: true,
      items: rows.map((row) => ({
        id: row.id,
        body: row.body,
        scriptureRef: row.scripture_ref,
        imagePath: row.image_path,
        imageUrl: row.image_path ? urls.get(row.image_path) ?? null : null,
        imageAlt: row.image_alt,
        status: row.status,
        publishDate: row.publish_date,
        archivedAt: row.archived_at,
        createdAt: row.created_at,
      })),
    };
  } catch {
    return { available: false, items: [] };
  }
}
