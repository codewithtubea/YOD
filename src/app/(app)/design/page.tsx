import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { DesignShowcase } from "./showcase";

export const metadata: Metadata = {
  title: "Design system",
};

export default async function DesignPage() {
  await requireAdmin();

  return <DesignShowcase />;
}
