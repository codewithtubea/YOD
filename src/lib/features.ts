import type { AdminModuleId } from "@/lib/admin/types";

export type FeatureModule = {
  id: string;
  label: string;
  privacyId: string;
};

export const FEATURE_MODULES: FeatureModule[] = [
  { id: "today", label: "Daily reading", privacyId: "reading" },
  { id: "reflections", label: "Reflections", privacyId: "reflections" },
  { id: "questions", label: "Questions", privacyId: "questions" },
  { id: "prayer-wall", label: "Prayer wall", privacyId: "prayer" },
  {
    id: "anonymous-prayer",
    label: "Anonymous prayer",
    privacyId: "anonymous-prayer",
  },
  {
    id: "affirmations",
    label: "Affirmations",
    privacyId: "affirmations",
  },
  { id: "profile", label: "Member profile", privacyId: "profile" },
  { id: "directory", label: "Member directory", privacyId: "profile" },
  { id: "check-in", label: "Weekly check-in", privacyId: "check-in" },
  {
    id: "encouragements",
    label: "Encouragement notes",
    privacyId: "encouragement",
  },
  { id: "notifications", label: "Notifications", privacyId: "settings" },
  { id: "concerns", label: "Concerns", privacyId: "concerns" },
  { id: "admin-tools", label: "Admin tools", privacyId: "admin-only" },
];

export type MemberNavId =
  | "today"
  | "prayer"
  | "affirmation"
  | "circle"
  | "more";

export type MemberNavItem = {
  id: MemberNavId;
  label: string;
  href: string;
  icon: MemberNavId;
  badge?: "encouragement" | "attention";
};

export const MEMBER_PRIMARY_NAV: MemberNavItem[] = [
  { id: "today", label: "Today", href: "/today", icon: "today" },
  { id: "prayer", label: "Prayer", href: "/prayer", icon: "prayer" },
  {
    id: "affirmation",
    label: "Affirmation",
    href: "/affirmation",
    icon: "affirmation",
  },
  {
    id: "circle",
    label: "Circle",
    href: "/people",
    icon: "circle",
    badge: "encouragement",
  },
  {
    id: "more",
    label: "More",
    href: "/more",
    icon: "more",
    badge: "attention",
  },
];

export type MemberMoreIcon =
  | "sermons"
  | "questions"
  | "archive"
  | "check-in"
  | "profile"
  | "settings"
  | "help"
  | "privacy"
  | "admin";

export type MemberMoreItem = {
  id: string;
  label: string;
  href: string;
  description: string;
  icon: MemberMoreIcon;
  badge?: "check-in";
};

export type MemberMoreGroup = {
  id: string;
  label: string;
  items: MemberMoreItem[];
};

export const MEMBER_MORE_GROUPS: MemberMoreGroup[] = [
  {
    id: "circle",
    label: "Your circle",
    items: [
      {
        id: "sermons",
        label: "Sermons",
        href: "/today#sermons",
        description: "Watch or listen to the teachings the circle is following.",
        icon: "sermons",
      },
      {
        id: "questions",
        label: "Questions",
        href: "/today/questions",
        description: "See what the circle is asking, and what has been answered.",
        icon: "questions",
      },
      {
        id: "archive",
        label: "Reading archive",
        href: "/today/archive",
        description: "Return to a past day of reading and reflection.",
        icon: "archive",
      },
      {
        id: "check-in",
        label: "Weekly check-in",
        href: "/check-in",
        description: "Share a short, honest word about how the week is going.",
        icon: "check-in",
        badge: "check-in",
      },
    ],
  },
  {
    id: "you",
    label: "You",
    items: [
      {
        id: "profile",
        label: "Profile",
        href: "/profile",
        description: "Your name, photo, and bio as the circle sees them.",
        icon: "profile",
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        description: "Appearance, notifications, and account choices.",
        icon: "settings",
      },
    ],
  },
  {
    id: "about",
    label: "About",
    items: [
      {
        id: "help",
        label: "Help",
        href: "/help",
        description: "Answers to common questions and a way to reach the admins.",
        icon: "help",
      },
      {
        id: "privacy",
        label: "Privacy",
        href: "/privacy",
        description: "What is shared, what stays private, and your data choices.",
        icon: "privacy",
      },
    ],
  },
];

export const MEMBER_ADMIN_ITEM: MemberMoreItem = {
  id: "admin",
  label: "Admin",
  href: "/admin",
  description: "Manage members, content, and care for the circle.",
  icon: "admin",
};

export function memberNavActiveId(pathname: string): MemberNavId | null {
  if (pathname === "/today" || pathname.startsWith("/today/")) return "today";
  if (pathname === "/prayer" || pathname.startsWith("/prayer/")) return "prayer";
  if (pathname === "/affirmation" || pathname.startsWith("/affirmation/")) {
    return "affirmation";
  }
  if (pathname === "/people" || pathname.startsWith("/people/")) return "circle";
  if (pathname.startsWith("/profile/")) return "circle";
  if (pathname === "/more") return "more";
  if (
    ["/profile", "/settings", "/help", "/privacy", "/check-in"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return "more";
  }
  return null;
}

export type AdminNavItem = {
  id: AdminModuleId;
  label: string;
  href: string;
  icon: AdminModuleId;
  description: string;
  synonyms: string[];
};

export const ADMIN_OVERVIEW: AdminNavItem = {
  id: "overview",
  label: "Overview",
  href: "/admin",
  icon: "overview",
  description: "What needs a gentle hand today.",
  synonyms: ["home", "dashboard", "waiting", "admin"],
};

export type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "people",
    label: "People",
    items: [
      {
        id: "members",
        label: "Members",
        href: "/admin/members",
        icon: "members",
        description: "People, approvals, and invites.",
        synonyms: [
          "member",
          "people",
          "approve",
          "approval",
          "waiting",
          "invite",
          "invites",
          "deactivate",
        ],
      },
      {
        id: "care",
        label: "Care & check-ins",
        href: "/admin/care",
        icon: "care",
        description: "Weekly check-ins and gentle follow-up.",
        synonyms: ["check-in", "checkins", "mood", "nudge", "care"],
      },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      {
        id: "reading",
        label: "Reading plan",
        href: "/admin/reading",
        icon: "reading",
        description: "Schedule the daily chapter.",
        synonyms: ["bible", "chapter", "schedule", "reading", "plan"],
      },
      {
        id: "affirmations",
        label: "Affirmations",
        href: "/admin/affirmations",
        icon: "affirmations",
        description: "Write and schedule the daily word.",
        synonyms: ["affirmation", "word", "daily"],
      },
      {
        id: "sermons",
        label: "Sermons",
        href: "/admin/sermons",
        icon: "sermons",
        description: "Manage the sermon shelf.",
        synonyms: ["sermon", "youtube", "vimeo", "link", "listen"],
      },
      {
        id: "announcements",
        label: "Announcements",
        href: "/admin/announcements",
        icon: "announcements",
        description: "Post one live notice on Today.",
        synonyms: ["announcement", "notice", "publish"],
      },
    ],
  },
  {
    id: "conversation",
    label: "Conversation",
    items: [
      {
        id: "questions",
        label: "Member questions",
        href: "/admin/questions",
        icon: "questions",
        description: "Read, reply, and mark questions answered.",
        synonyms: ["question", "answer", "reply", "ask"],
      },
      {
        id: "moderation",
        label: "Reports & hidden content",
        href: "/admin/moderation",
        icon: "moderation",
        description: "Reports, hidden content, and member concerns.",
        synonyms: ["report", "hide", "hidden", "concern", "moderation"],
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        id: "settings",
        label: "Circle settings",
        href: "/admin/settings",
        icon: "settings",
        description: "Name, timezone, and care timing.",
        synonyms: ["timezone", "time zone", "name", "settings", "configuration"],
      },
      {
        id: "audit",
        label: "Activity log",
        href: "/admin/audit",
        icon: "audit",
        description: "A record of admin changes.",
        synonyms: ["audit", "history", "log", "activity"],
      },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  ADMIN_OVERVIEW,
  ...ADMIN_NAV_GROUPS.flatMap((group) => group.items),
];

export type AdminCommand = {
  id: string;
  label: string;
  href: string;
  description: string;
  synonyms: string[];
};

export const ADMIN_COMMANDS: AdminCommand[] = [
  {
    id: "add-reading",
    label: "Add reading",
    href: "/admin/reading#add-reading",
    description: "Schedule today or another day.",
    synonyms: ["schedule reading", "plan", "chapter", "bible"],
  },
  {
    id: "invite-someone",
    label: "Invite someone",
    href: "/admin/members?tab=invited&invite=1",
    description: "Pre-approve one email and copy the message.",
    synonyms: ["invite", "add member", "share link", "email", "approve"],
  },
  {
    id: "write-announcement",
    label: "Write announcement",
    href: "/admin/announcements#announcement-editor",
    description: "Post one live notice on Today.",
    synonyms: ["announce", "notice", "publish"],
  },
  {
    id: "write-affirmation",
    label: "Write affirmation",
    href: "/admin/affirmations#affirmations",
    description: "Add a word for an upcoming day.",
    synonyms: ["affirmation", "word", "daily"],
  },
  {
    id: "add-sermon",
    label: "Add sermon",
    href: "/admin/sermons#sermon-editor",
    description: "Add one teaching link to the shelf.",
    synonyms: ["sermon", "youtube", "vimeo", "link"],
  },
  {
    id: "review-waiting",
    label: "Review waiting members",
    href: "/admin/members?tab=waiting",
    description: "Open the door for someone new.",
    synonyms: ["approve", "approval", "waiting", "member"],
  },
  {
    id: "answer-questions",
    label: "Answer questions",
    href: "/admin/questions?filter=open#question-list",
    description: "Reply and mark a question answered.",
    synonyms: ["question", "answer", "reply"],
  },
  {
    id: "review-reports",
    label: "Review reports",
    href: "/admin/moderation?tab=reports",
    description: "Read the context and resolve with care.",
    synonyms: ["report", "hide", "moderation", "concern"],
  },
];

export function adminCommandMatches(
  item: Pick<AdminNavItem, "label" | "description" | "synonyms">,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [item.label, item.description, ...item.synonyms].some((value) =>
    value.toLowerCase().includes(needle),
  );
}
