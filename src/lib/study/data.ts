import { getCircleSettings, getCircleToday } from "@/lib/circle";
import { signedAvatarUrls } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/server";
import type {
  ArchiveDay,
  MemberSummary,
  NotificationItem,
  PlanView,
  PostView,
  QuestionItem,
  ReactionState,
  ReplyView,
  TodayData,
} from "@/lib/study/types";

const POST_SELECT =
  "id, plan_date, author_id, kind, body, status, answered_reply_id, edited_at, created_at";

const REPLY_SELECT =
  "id, post_id, parent_reply_id, author_id, body, edited_at, created_at";

type DirectoryRow = {
  id: string;
  display_name: string;
  avatar_path: string | null;
};

type MemberLookup = {
  members: Map<string, DirectoryRow>;
  avatarUrls: Map<string, string>;
};

type PostRow = {
  id: string;
  plan_date: string;
  author_id: string | null;
  kind: "thought" | "question";
  body: string;
  status: "open" | "answered";
  answered_reply_id: string | null;
  edited_at: string | null;
  created_at: string;
};

type ReplyRow = {
  id: string;
  post_id: string;
  parent_reply_id: string | null;
  author_id: string | null;
  body: string;
  edited_at: string | null;
  created_at: string;
};

type ReactionRow = {
  target_id: string;
  amen_count: number | string;
  viewer_amen: boolean;
};

type PlanRow = {
  id: string;
  date: string;
  book: string;
  chapter_start: number;
  chapter_end: number | null;
  reference_text: string;
};

function memberFrom(
  id: string | null,
  lookup: MemberLookup,
): MemberSummary {
  const author = id ? lookup.members.get(id) : undefined;
  return {
    id: author?.id ?? null,
    displayName: author?.display_name ?? "Former member",
    avatarUrl: author?.avatar_path
      ? (lookup.avatarUrls.get(author.avatar_path) ?? null)
      : null,
  };
}

async function memberLookup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ids: (string | null)[],
): Promise<MemberLookup> {
  const unique = Array.from(
    new Set(ids.filter((id): id is string => Boolean(id))),
  );
  const members = new Map<string, DirectoryRow>();
  if (unique.length === 0) {
    return { members, avatarUrls: new Map() };
  }

  const { data, error } = await supabase
    .from("member_directory")
    .select("id, display_name, avatar_path")
    .in("id", unique);

  if (error || !data) {
    return { members, avatarUrls: new Map() };
  }

  const rows = data as DirectoryRow[];
  for (const row of rows) members.set(row.id, row);

  const avatarUrls = await signedAvatarUrls(
    supabase,
    rows.map((row) => row.avatar_path),
  );

  return { members, avatarUrls };
}

function planView(row: PlanRow): PlanView {
  return {
    id: row.id,
    date: row.date,
    book: row.book,
    chapterStart: row.chapter_start,
    chapterEnd: row.chapter_end,
    referenceText: row.reference_text,
  };
}

async function reactionMap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  targetType: "post" | "reply",
  ids: string[],
) {
  const map = new Map<string, ReactionState>();
  if (ids.length === 0) return map;

  const { data, error } = await supabase.rpc("get_reaction_summary", {
    p_target_type: targetType,
    p_target_ids: ids,
  });

  if (error || !data) return map;

  for (const row of data as ReactionRow[]) {
    map.set(row.target_id, {
      amenCount: Number(row.amen_count) || 0,
      viewerAmen: Boolean(row.viewer_amen),
    });
  }

  return map;
}

function hydrateReplies(
  rows: ReplyRow[],
  reactions: Map<string, ReactionState>,
  lookup: MemberLookup,
): ReplyView[] {
  const replyIds = new Set(rows.map((row) => row.id));
  const visibleRows = rows.filter(
    (row) => !row.parent_reply_id || replyIds.has(row.parent_reply_id),
  );

  return visibleRows.map((row) => {
    const state = reactions.get(row.id) ?? {
      amenCount: 0,
      viewerAmen: false,
    };

    return {
      id: row.id,
      postId: row.post_id,
      parentReplyId: row.parent_reply_id,
      authorId: row.author_id,
      author: memberFrom(row.author_id, lookup),
      body: row.body,
      editedAt: row.edited_at,
      createdAt: row.created_at,
      ...state,
    };
  });
}

function hydratePosts(
  rows: PostRow[],
  replies: ReplyView[],
  reactions: Map<string, ReactionState>,
  lookup: MemberLookup,
  replyCounts?: Map<string, number>,
): PostView[] {
  return rows.map((row) => {
    const state = reactions.get(row.id) ?? {
      amenCount: 0,
      viewerAmen: false,
    };
    const postReplies = replies.filter((reply) => reply.postId === row.id);

    return {
      id: row.id,
      planDate: row.plan_date,
      authorId: row.author_id,
      author: memberFrom(row.author_id, lookup),
      kind: row.kind,
      body: row.body,
      status: row.status,
      answeredReplyId: row.answered_reply_id,
      editedAt: row.edited_at,
      createdAt: row.created_at,
      ...state,
      replyCount: replyCounts?.get(row.id) ?? postReplies.length,
      replies: postReplies,
    };
  });
}

export async function getTodayData({
  planDate,
  limit = 20,
  cursor,
}: {
  planDate?: string;
  limit?: number;
  cursor?: { createdAt: string; id: string } | null;
}): Promise<TodayData> {
  const settings = await getCircleSettings();
  const today = await getCircleToday();
  const date = planDate ?? today;

  const fallback: TodayData = {
    available: false,
    plan: null,
    posts: [],
    hasMore: false,
    nextCursor: null,
    readSummary: { readCount: 0, activeCount: 0 },
    viewerHasRead: false,
    settings: {
      name: settings.name,
      timezone: settings.timezone,
      defaultBibleSource: settings.defaultBibleSource,
    },
  };

  try {
    if (date > today) return { ...fallback, available: true };

    const supabase = await createClient();

    const planResult = await supabase
      .from("reading_plan")
      .select(
        "id, date, book, chapter_start, chapter_end, reference_text",
      )
      .eq("date", date)
      .maybeSingle();

    if (planResult.error) return fallback;

    let postsQuery = supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("plan_date", date)
      .is("deleted_at", null)
      .is("hidden_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    if (cursor?.id && cursor.createdAt) {
      postsQuery = postsQuery.or(
        `created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`,
      );
    }

    const postsResult = await postsQuery;
    if (postsResult.error) return { ...fallback, available: true };

    const rows = (postsResult.data ?? []) as unknown as PostRow[];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;
    const postIds = pageRows.map((row) => row.id);

    let replyRows: ReplyRow[] = [];
    if (postIds.length > 0) {
      const repliesResult = await supabase
        .from("replies")
        .select(REPLY_SELECT)
        .in("post_id", postIds)
        .is("deleted_at", null)
        .is("hidden_at", null)
        .order("created_at", { ascending: true });

      if (!repliesResult.error) {
        replyRows = (repliesResult.data ?? []) as unknown as ReplyRow[];
      }
    }

    const replyIds = replyRows.map((row) => row.id);
    const [postReactions, replyReactions, lookup] = await Promise.all([
      reactionMap(supabase, "post", postIds),
      reactionMap(supabase, "reply", replyIds),
      memberLookup(supabase, [
        ...pageRows.map((row) => row.author_id),
        ...replyRows.map((row) => row.author_id),
      ]),
    ]);

    const replies = hydrateReplies(replyRows, replyReactions, lookup);
    const posts = hydratePosts(
      pageRows,
      replies,
      postReactions,
      lookup,
    );
    const last = pageRows.at(-1);

    const [readResult, receiptResult] = await Promise.all([
      supabase.rpc("get_read_summary", { p_date: date }),
      supabase
        .from("read_receipts")
        .select("plan_date")
        .eq("plan_date", date)
        .maybeSingle(),
    ]);

    const readRow = !readResult.error
      ? ((readResult.data ?? []) as unknown as {
          read_count: number;
          active_count: number;
        }[])[0]
      : undefined;

    return {
      available: true,
      plan: planResult.data
        ? planView(planResult.data as unknown as PlanRow)
        : null,
      posts,
      hasMore,
      nextCursor:
        hasMore && last ? `${last.created_at}|${last.id}` : null,
      readSummary: {
        readCount: Number(readRow?.read_count ?? 0),
        activeCount: Number(readRow?.active_count ?? 0),
      },
      viewerHasRead: Boolean(receiptResult.data),
      settings: {
        name: settings.name,
        timezone: settings.timezone,
        defaultBibleSource: settings.defaultBibleSource,
      },
    };
  } catch {
    return fallback;
  }
}

export async function getQuestionsData(status: "open" | "answered") {
  const today = await getCircleToday();

  try {
    const supabase = await createClient();
    const result = await supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("kind", "question")
      .eq("status", status)
      .lte("plan_date", today)
      .is("deleted_at", null)
      .is("hidden_at", null)
      .order("created_at", { ascending: false })
      .limit(80);

    if (result.error) return { available: false, items: [] as QuestionItem[] };

    const rows = (result.data ?? []) as unknown as PostRow[];
    const ids = rows.map((row) => row.id);
    const dates = Array.from(new Set(rows.map((row) => row.plan_date)));

    const [reactions, lookup] = await Promise.all([
      reactionMap(supabase, "post", ids),
      memberLookup(supabase, rows.map((row) => row.author_id)),
    ]);

    const countMap = new Map<string, number>();
    if (ids.length > 0) {
      const counts = await supabase.rpc("get_reply_counts", {
        p_post_ids: ids,
      });

      for (const row of (counts.data ?? []) as unknown as {
        post_id: string;
        reply_count: number;
      }[]) {
        countMap.set(row.post_id, Number(row.reply_count) || 0);
      }
    }

    const planMap = new Map<string, string>();
    if (dates.length > 0) {
      const plans = await supabase
        .from("reading_plan")
        .select("date, reference_text")
        .in("date", dates);

      for (const row of (plans.data ?? []) as unknown as {
        date: string;
        reference_text: string;
      }[]) {
        planMap.set(row.date, row.reference_text);
      }
    }

    const items: QuestionItem[] = hydratePosts(
      rows,
      [],
      reactions,
      lookup,
      countMap,
    ).map((post) => ({
      ...post,
      planReference:
        planMap.get(post.planDate) ?? post.planDate,
    }));

    return { available: true, items };
  } catch {
    return { available: false, items: [] as QuestionItem[] };
  }
}

export async function getThreadData(postId: string) {
  try {
    const supabase = await createClient();
    const postResult = await supabase
      .from("posts")
      .select(POST_SELECT)
      .eq("id", postId)
      .is("deleted_at", null)
      .is("hidden_at", null)
      .maybeSingle();

    if (postResult.error || !postResult.data) return null;

    const row = postResult.data as unknown as PostRow;
    const planResult = await supabase
      .from("reading_plan")
      .select("id, date, book, chapter_start, chapter_end, reference_text")
      .eq("date", row.plan_date)
      .maybeSingle();

    const repliesResult = await supabase
      .from("replies")
      .select(REPLY_SELECT)
      .eq("post_id", postId)
      .is("deleted_at", null)
      .is("hidden_at", null)
      .order("created_at", { ascending: true });

    const replyRows = repliesResult.error
      ? []
      : ((repliesResult.data ?? []) as unknown as ReplyRow[]);

    const [postReactions, replyReactions, lookup] = await Promise.all([
      reactionMap(supabase, "post", [postId]),
      reactionMap(
        supabase,
        "reply",
        replyRows.map((reply) => reply.id),
      ),
      memberLookup(supabase, [
        row.author_id,
        ...replyRows.map((reply) => reply.author_id),
      ]),
    ]);

    const [post] = hydratePosts(
      [row],
      hydrateReplies(replyRows, replyReactions, lookup),
      postReactions,
      lookup,
    );

    return {
      post: post ?? null,
      plan: planResult.data
        ? planView(planResult.data as unknown as PlanRow)
        : null,
    };
  } catch {
    return null;
  }
}

export async function getArchiveData(): Promise<{
  available: boolean;
  days: ArchiveDay[];
}> {
  const today = await getCircleToday();

  try {
    const supabase = await createClient();
    const plans = await supabase
      .from("reading_plan")
      .select("date, reference_text")
      .lte("date", today)
      .order("date", { ascending: false })
      .limit(1000);

    if (plans.error) return { available: false, days: [] };

    const rows = (plans.data ?? []) as unknown as {
      date: string;
      reference_text: string;
    }[];

    if (rows.length === 0) return { available: true, days: [] };

    const dates = rows.map((row) => row.date);
    const postRows = await supabase
      .from("posts")
      .select("plan_date")
      .in("plan_date", dates)
      .is("deleted_at", null)
      .is("hidden_at", null)
      .limit(2000);

    const counts = new Map<string, number>();
    if (!postRows.error) {
      for (const post of (postRows.data ?? []) as unknown as {
        plan_date: string;
      }[]) {
        counts.set(post.plan_date, (counts.get(post.plan_date) ?? 0) + 1);
      }
    }

    return {
      available: true,
      days: rows.map((row) => ({
        date: row.date,
        referenceText: row.reference_text,
        postCount: counts.get(row.date) ?? 0,
      })),
    };
  } catch {
    return { available: false, days: [] };
  }
}

export async function getNotificationsData(viewerId: string): Promise<{
  available: boolean;
  unreadCount: number;
  items: NotificationItem[];
}> {
  try {
    const supabase = await createClient();
    const [list, unread] = await Promise.all([
      supabase
        .from("notifications")
        .select(
          "id, type, actor_id, post_id, reply_id, read_at, created_at",
        )
        .eq("user_id", viewerId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", viewerId)
        .is("read_at", null),
    ]);

    if (list.error) {
      return { available: false, unreadCount: 0, items: [] };
    }

    const rows = (list.data ?? []) as unknown as {
      id: string;
      type: "reply" | "amen" | "answered" | "encouragement" | "nudge";
      actor_id: string | null;
      post_id: string | null;
      reply_id: string | null;
      read_at: string | null;
      created_at: string;
    }[];

    const lookup = await memberLookup(
      supabase,
      rows.map((row) => row.actor_id),
    );

    const postIds = Array.from(
      new Set(rows.map((row) => row.post_id).filter((id): id is string => Boolean(id))),
    );

    const postMap = new Map<
      string,
      { planDate: string; kind: "thought" | "question"; authorId: string }
    >();

    if (postIds.length > 0) {
      const posts = await supabase
        .from("posts")
        .select("id, plan_date, kind, author_id")
        .in("id", postIds);

      for (const post of (posts.data ?? []) as unknown as {
        id: string;
        plan_date: string;
        kind: "thought" | "question";
        author_id: string;
      }[]) {
        postMap.set(post.id, {
          planDate: post.plan_date,
          kind: post.kind,
          authorId: post.author_id,
        });
      }
    }

    const dates = Array.from(
      new Set(Array.from(postMap.values()).map((post) => post.planDate)),
    );
    const planMap = new Map<string, string>();

    if (dates.length > 0) {
      const plans = await supabase
        .from("reading_plan")
        .select("date, reference_text")
        .in("date", dates);

      for (const plan of (plans.data ?? []) as unknown as {
        date: string;
        reference_text: string;
      }[]) {
        planMap.set(plan.date, plan.reference_text);
      }
    }

    const items: NotificationItem[] = rows.map((row) => {
      const actor = row.actor_id
        ? (lookup.members.get(row.actor_id)?.display_name ?? "A member")
        : "A member";
      const post = row.post_id ? postMap.get(row.post_id) : null;
      const reference = post ? planMap.get(post.planDate) ?? "a reading" : "a reading";
      const kind = post?.kind === "question" ? "question" : "thought";

      let message = `${actor} responded on ${reference}.`;
      let href = row.post_id ? `/today/thread/${row.post_id}` : "/today";

      if (row.type === "reply") {
        message = `${actor} replied to your ${kind} on ${reference}.`;
      } else if (row.type === "amen") {
        message = `${actor} said Amen to your ${kind} on ${reference}.`;
      } else if (row.type === "answered") {
        message =
          post?.authorId === viewerId
            ? `${actor} marked your question answered on ${reference}.`
            : `${actor} marked an answer on ${reference}.`;
      } else if (row.type === "encouragement") {
        message = `${actor} sent you a word of encouragement.`;
        href = "/check-in";
      } else if (row.type === "nudge") {
        message = post
          ? `${actor} gently nudged your ${kind} on ${reference}.`
          : `${actor} sent you a gentle nudge.`;
      }

      return {
        id: row.id,
        type: row.type,
        actorName: actor,
        message,
        href,
        readAt: row.read_at,
        createdAt: row.created_at,
      };
    });

    return {
      available: true,
      unreadCount: unread.count ?? items.filter((item) => !item.readAt).length,
      items,
    };
  } catch {
    return { available: false, unreadCount: 0, items: [] };
  }
}

export async function getAdminPlans(): Promise<{
  available: boolean;
  plans: PlanView[];
}> {
  try {
    const supabase = await createClient();
    const result = await supabase
      .from("reading_plan")
      .select("id, date, book, chapter_start, chapter_end, reference_text")
      .order("date", { ascending: false })
      .limit(500);

    if (result.error) return { available: false, plans: [] };

    return {
      available: true,
      plans: ((result.data ?? []) as unknown as PlanRow[]).map(planView),
    };
  } catch {
    return { available: false, plans: [] };
  }
}
