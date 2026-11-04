export type PrivacyVisibility = "private" | "circle" | "admin";

export type PrivacyFeature = {
  id: string;
  label: string;
  description: string;
  visibility: PrivacyVisibility;
  includedInExport: boolean;
  deletedWithAccount: "kept" | "removed" | "choice";
};

export const PRIVACY_FEATURES: PrivacyFeature[] = [
  {
    id: "profile",
    label: "Profile",
    description:
      "Your name, short bio, and photo. Active members can see these. Email is never shown to members.",
    visibility: "circle",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
  {
    id: "reflections",
    label: "Reflections and questions",
    description:
      "Posts and replies you share on a reading. Visible to active members. You can delete them yourself.",
    visibility: "circle",
    includedInExport: true,
    deletedWithAccount: "choice",
  },
  {
    id: "questions",
    label: "Questions",
    description:
      "A question appears with your name on the reading. Answers and replies are visible to active members, and admins can mark a question answered.",
    visibility: "circle",
    includedInExport: true,
    deletedWithAccount: "choice",
  },
  {
    id: "amens",
    label: "Amens",
    description:
      "Only aggregate counts are shown. Members cannot see who said Amen.",
    visibility: "private",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
  {
    id: "reading",
    label: "Reading marks",
    description:
      "The circle sees only a total count that you read the day. No member names or lists.",
    visibility: "private",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
  {
    id: "prayer",
    label: "Prayer wall",
    description:
      "Prayers are posted without your name. You keep ownership privately so you can add an update or mark a prayer answered.",
    visibility: "circle",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
  {
    id: "anonymous-prayer",
    label: "Anonymous prayer authorship",
    description:
      "The circle sees no name with a prayer. If a safety concern requires it, an admin can see the author only through an audit-logged admin path.",
    visibility: "admin",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
  {
    id: "email",
    label: "Email address",
    description:
      "Your email is used for sign-in and account recovery. Other members never see it.",
    visibility: "private",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
  {
    id: "admin-only",
    label: "Admin-only records",
    description:
      "Reports, admin notes, and audit entries help the circle stay safe. They stay out of member views and exports.",
    visibility: "admin",
    includedInExport: false,
    deletedWithAccount: "kept",
  },
  {
    id: "affirmations",
    label: "Saved affirmations",
    description:
      "Your saves are private. Only you can see them, and only aggregate Amens are shown.",
    visibility: "private",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
  {
    id: "check-in",
    label: "Weekly check-in",
    description:
      "A short weekly word about how you are, plus an optional private note. Admins can read it so they can care for you. Other members only see a total count of who checked in, never names or answers.",
    visibility: "admin",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
  {
    id: "encouragement",
    label: "Encouragement notes",
    description:
      "Private notes between you and another member. The recipient sees your name; no other member or admin can read the note contents.",
    visibility: "private",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
  {
    id: "settings",
    label: "Display settings",
    description:
      "Theme, reduced motion, and text size. Stored for your account so they follow you to another device.",
    visibility: "private",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
  {
    id: "concerns",
    label: "Messages to admins",
    description:
      "A concern you send is visible to admins only. Other members never see it.",
    visibility: "admin",
    includedInExport: true,
    deletedWithAccount: "removed",
  },
];

export const PRIVACY_VISIBILITY_LABELS: Record<PrivacyVisibility, string> = {
  private: "Only you",
  circle: "Active members",
  admin: "Admins only",
};

export function privacyFeature(id: string) {
  return PRIVACY_FEATURES.find((feature) => feature.id === id) ?? null;
}
