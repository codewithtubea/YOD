"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { clearMyAvatar, setMyAvatar } from "@/lib/account/actions";
import { resizeAvatar } from "@/lib/account/image";
import { AVATAR_BUCKET } from "@/lib/profile/avatar";
import { createClient } from "@/lib/supabase/client";

export function AvatarPicker({
  userId,
  name,
  initialUrl,
}: {
  userId: string;
  name: string;
  initialUrl: string | null;
}) {
  const input = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBusy(true);
    setError(null);

    const previous = preview;
    let optimisticUrl: string | null = null;

    try {
      const blob = await resizeAvatar(file);
      optimisticUrl = URL.createObjectURL(blob);
      setPreview(optimisticUrl);

      const supabase = createClient();
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(
          uploadError.message.toLowerCase().includes("size")
            ? "That image is still too large."
            : "The photo could not be uploaded. Try again.",
        );
      }

      const result = await setMyAvatar(path);
      if (!result.ok) {
        await supabase.storage.from(AVATAR_BUCKET).remove([path]);
        throw new Error(result.message);
      }

      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = optimisticUrl;
      toast({ title: "Photo updated", tone: "gold" });
      router.refresh();
    } catch (caught) {
      if (optimisticUrl) URL.revokeObjectURL(optimisticUrl);
      setPreview(previous);
      setError(
        caught instanceof Error
          ? caught.message
          : "The photo could not be updated.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);

    const previous = preview;
    setPreview(null);

    const result = await clearMyAvatar();
    setBusy(false);

    if (!result.ok) {
      setPreview(previous);
      setError(result.message);
      return;
    }

    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
    }
    toast({ title: "Photo removed" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Avatar name={name} src={preview} size="lg" className="size-20 text-xl" />

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="quiet"
            size="sm"
            loading={busy}
            onClick={() => input.current?.click()}
          >
            {preview ? "Change photo" : "Add a photo"}
          </Button>
          {preview ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={remove}
            >
              Remove
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink-soft">
          A square JPEG, PNG, or WebP under 8 MB. It is cropped and resized
          before upload. Photos are private to the circle.
        </p>
        {error ? (
          <p role="alert" className="mt-2 text-xs font-medium text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={choose}
        aria-label="Choose a profile photo"
      />
    </div>
  );
}
