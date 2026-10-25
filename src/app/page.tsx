import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth";

export default async function Home() {
  const context = await getAuthContext();

  if (!context) redirect("/sign-in");

  if (context.membership?.status === "active") {
    redirect("/today");
  }

  redirect(
    `/sign-in?error=${
      context.error ?? (context.membership ? "inactive" : "profile")
    }`,
  );
}
