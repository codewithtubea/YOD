"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
        YOD Circle
      </p>
      <h1 className="type-title text-ink">Something went quiet.</h1>
      <p className="max-w-prose text-sm leading-relaxed text-ink-soft">
        This page could not load just now. Nothing you wrote was lost. Try
        again in a moment.
      </p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </main>
  );
}
