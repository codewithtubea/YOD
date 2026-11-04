import { NextResponse } from "next/server";

import { exportToMarkdown } from "@/lib/account/export-format";
import { createZip } from "@/lib/account/zip";
import { getAuthContext } from "@/lib/auth";
import { circleDateInTimeZone } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getAuthContext();

  if (!context) {
    return NextResponse.json(
      { error: "Your session has ended. Sign in again." },
      { status: 401 },
    );
  }

  if (context.membership?.status !== "active") {
    return NextResponse.json(
      { error: "This account is not active." },
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");

  if (error || !data) {
    if (error?.code === "PGRST202" || error?.code === "PGRST205") {
      return NextResponse.json(
        { error: "The export is not ready yet. Apply the Phase 5B migration." },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error:
          error?.message?.toLowerCase().includes("rate") ||
          error?.code === "P0001"
            ? "You have exported recently. Try again in a little while."
            : "The export could not be prepared. Try again.",
      },
      { status: error?.code === "P0001" ? 429 : 500 },
    );
  }

  const day = circleDateInTimeZone();
  const zip = createZip([
    {
      name: `yod-circle-export-${day}.json`,
      content: JSON.stringify(data, null, 2),
    },
    {
      name: `yod-circle-export-${day}.md`,
      content: exportToMarkdown(data),
    },
  ]);

  return new NextResponse(Buffer.from(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="yod-circle-export-${day}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
