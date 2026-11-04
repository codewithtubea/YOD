"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

function filenameFrom(header: string | null) {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? "yod-circle-export.zip";
}

export function ExportButton() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function download() {
    setLoading(true);

    try {
      const response = await fetch("/account/export", {
        method: "GET",
        credentials: "same-origin",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "The export could not be prepared.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filenameFrom(
        response.headers.get("Content-Disposition"),
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast({
        title: "Export ready",
        description: "The zip contains your JSON and Markdown files.",
        tone: "gold",
      });
    } catch (caught) {
      toast({
        title: "Export not ready",
        description:
          caught instanceof Error ? caught.message : "Try again in a moment.",
        tone: "danger",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="quiet"
      size="sm"
      loading={loading}
      onClick={download}
    >
      Download your data
    </Button>
  );
}
