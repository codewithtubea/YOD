import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminCounts } from "@/lib/admin/data";
import { getAdminModules } from "@/lib/admin/registry";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { membership } = await requireAdmin();
  const { counts } = await getAdminCounts();
  const modules = getAdminModules(counts);

  return (
    <AdminShell modules={modules} membership={membership}>
      {children}
    </AdminShell>
  );
}
