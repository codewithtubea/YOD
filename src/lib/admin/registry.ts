import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_ITEMS,
  ADMIN_OVERVIEW,
} from "@/lib/features";

import type { AdminCounts, AdminModuleId } from "./types";

export type AdminModule = {
  id: AdminModuleId;
  label: string;
  icon: AdminModuleId;
  href: string;
  requiresAdmin: true;
  group: string | null;
  description: string;
  synonyms: string[];
  badgeCount?: number;
};

const GROUP_BY_ID = new Map(
  ADMIN_NAV_GROUPS.flatMap((group) =>
    group.items.map((item) => [item.id, group.label] as const),
  ),
);

const MODULES: Omit<AdminModule, "badgeCount">[] = ADMIN_NAV_ITEMS.map(
  (item) => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    href: item.href,
    requiresAdmin: true,
    group: GROUP_BY_ID.get(item.id) ?? null,
    description: item.description,
    synonyms: item.synonyms,
  }),
);

function badgeFor(id: AdminModuleId, counts?: AdminCounts) {
  if (!counts) return 0;

  if (id === "members") {
    return counts.membersPending + counts.pendingInvites;
  }

  if (id === "moderation") {
    return (
      counts.pendingReports + counts.pendingConcerns + counts.hiddenContent
    );
  }

  if (id === "questions") return counts.pendingQuestions;

  return 0;
}

export function getAdminModules(counts?: AdminCounts): AdminModule[] {
  return MODULES.map((module) => {
    const badgeCount = badgeFor(module.id, counts);
    return badgeCount > 0 ? { ...module, badgeCount } : { ...module };
  });
}

export function activeAdminModule(pathname: string): AdminModuleId {
  if (pathname === "/admin/invites" || pathname.startsWith("/admin/invites/")) {
    return "members";
  }

  const match = [...MODULES]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (module) =>
        pathname === module.href ||
        (module.href !== "/admin" && pathname.startsWith(`${module.href}/`)),
    );
  return match?.id ?? "overview";
}

export { ADMIN_OVERVIEW };
export const ADMIN_MODULES = MODULES;
