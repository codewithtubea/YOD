export type Viewer = {
  userId: string;
  displayName: string;
  role: "member" | "admin";
};

export type MemberSummary = {
  id: string | null;
  displayName: string;
  avatarUrl: string | null;
};

export type ReactionState = {
  amenCount: number;
  viewerAmen: boolean;
};

export type ReplyView = ReactionState & {
  id: string;
  postId: string;
  parentReplyId: string | null;
  authorId: string | null;
  author: MemberSummary;
  body: string;
  editedAt: string | null;
  createdAt: string;
};

export type PostView = ReactionState & {
  id: string;
  planDate: string;
  authorId: string | null;
  author: MemberSummary;
  kind: "thought" | "question";
  body: string;
  status: "open" | "answered";
  answeredReplyId: string | null;
  editedAt: string | null;
  createdAt: string;
  replyCount: number;
  replies: ReplyView[];
};

export type PlanView = {
  id: string;
  date: string;
  book: string;
  chapterStart: number;
  chapterEnd: number | null;
  referenceText: string;
};

export type ReadSummary = {
  readCount: number;
  activeCount: number;
};

export type TodayData = {
  available: boolean;
  plan: PlanView | null;
  posts: PostView[];
  hasMore: boolean;
  nextCursor: string | null;
  readSummary: ReadSummary;
  viewerHasRead: boolean;
  settings: {
    name: string;
    timezone: string;
    defaultBibleSource: "biblegateway" | "youversion";
  };
};

export type QuestionItem = PostView & {
  planReference: string;
};

export type ArchiveDay = {
  date: string;
  referenceText: string;
  postCount: number;
};

export type NotificationItem = {
  id: string;
  type: "reply" | "amen" | "answered" | "encouragement" | "nudge";
  actorName: string;
  message: string;
  href: string;
  readAt: string | null;
  createdAt: string;
};

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
