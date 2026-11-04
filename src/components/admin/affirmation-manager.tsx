"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Archive, ImagePlus, Pencil, Plus, Sparkles, X } from "lucide-react";

import { AdminSection } from "@/components/admin/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  archiveAffirmation,
  saveAffirmation,
  uploadAffirmationImage,
} from "@/lib/affirmations/actions";
import { formatAffirmationDate } from "@/lib/affirmations/format";
import type {
  AdminAffirmation,
  AffirmationStatus,
} from "@/lib/affirmations/types";
import { cn } from "@/lib/cn";

const inputClass =
  "block min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

type FieldErrors = Record<string, string[]>;

type FormState = {
  id?: string;
  body: string;
  scriptureRef: string;
  status: AffirmationStatus;
  publishDate: string;
  imagePath: string | null;
  imageAlt: string;
  existingImageUrl: string | null;
  removeImage: boolean;
};

function blankForm(status: AffirmationStatus = "scheduled"): FormState {
  return {
    body: "",
    scriptureRef: "",
    status,
    publishDate: "",
    imagePath: null,
    imageAlt: "",
    existingImageUrl: null,
    removeImage: false,
  };
}

function statusLabel(item: AdminAffirmation, today: string) {
  if (item.status === "draft") return "Draft";
  if (item.status === "archived") return "Archived";
  if (item.publishDate && item.publishDate > today) return "Scheduled";
  return "Shared";
}

function statusTone(item: AdminAffirmation, today: string) {
  if (item.status === "draft") return "neutral" as const;
  if (item.status === "archived") return "neutral" as const;
  if (item.publishDate && item.publishDate > today) return "gold" as const;
  return "sage" as const;
}

function AffirmationRow({
  item,
  today,
  onEdit,
  onArchive,
}: {
  item: AdminAffirmation;
  today: string;
  onEdit: (item: AdminAffirmation) => void;
  onArchive: (item: AdminAffirmation) => void;
}) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/65 p-4 sm:flex-row sm:items-center">
      {item.imageUrl ? (
        <div className="relative h-16 w-full shrink-0 overflow-hidden rounded-xl sm:size-14">
          <Image
            src={item.imageUrl}
            alt={item.imageAlt ?? ""}
            fill
            sizes="64px"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium tabular-nums text-ink-soft">
            {item.publishDate
              ? formatAffirmationDate(item.publishDate, true)
              : "No day yet"}
          </p>
          <Badge tone={statusTone(item, today)}>
            {statusLabel(item, today)}
          </Badge>
          {item.imageUrl ? (
            <Badge tone="neutral">
              <ImagePlus aria-hidden size={11} />
              Image
            </Badge>
          ) : null}
        </div>
        <p className="mt-1.5 line-clamp-2 font-serif text-lg leading-snug text-ink">
          {item.body}
        </p>
        {item.scriptureRef ? (
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-ink-soft">
            {item.scriptureRef}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1 sm:justify-end">
        <Button variant="ghost" size="sm" onClick={() => onEdit(item)}>
          <Pencil aria-hidden size={14} />
          Edit
        </Button>
        {item.status === "scheduled" ? (
          <Button variant="ghost" size="sm" onClick={() => onArchive(item)}>
            <Archive aria-hidden size={14} />
            Archive
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function AffirmationManager({
  items,
  today,
}: {
  items: AdminAffirmation[];
  today: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FormState>(() => blankForm());
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [archiving, setArchiving] = useState<AdminAffirmation | null>(null);
  const [archiveSaving, setArchiveSaving] = useState(false);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    [],
  );

  function replacePreview(url: string | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  const drafts = items
    .filter((item) => item.status === "draft")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const shared = items
    .filter(
      (item) =>
        item.status === "archived" ||
        (item.status === "scheduled" &&
          item.publishDate !== null &&
          item.publishDate <= today),
    )
    .sort((a, b) => (b.publishDate ?? "").localeCompare(a.publishDate ?? ""));
  const upcoming = items
    .filter(
      (item) =>
        item.status === "scheduled" &&
        item.publishDate !== null &&
        item.publishDate > today,
    )
    .sort((a, b) => (a.publishDate ?? "").localeCompare(b.publishDate ?? ""));

  const visibleImage = draft.removeImage
    ? null
    : previewUrl ?? draft.existingImageUrl;

  function openCreate() {
    replacePreview(null);
    setDraft(blankForm());
    setFile(null);
    setError(null);
    setFieldErrors({});
    setOpen(true);
  }

  function openEdit(item: AdminAffirmation) {
    setDraft({
      id: item.id,
      body: item.body,
      scriptureRef: item.scriptureRef ?? "",
      status: item.status,
      publishDate: item.publishDate ?? "",
      imagePath: item.imagePath,
      imageAlt: item.imageAlt ?? "",
      existingImageUrl: item.imageUrl,
      removeImage: false,
    });
    replacePreview(null);
    setFile(null);
    setError(null);
    setFieldErrors({});
    setOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setOpen(false);
    replacePreview(null);
    setFile(null);
    setError(null);
    setFieldErrors({});
  }

  function chooseFile(next: File | null) {
    if (!next) return;
    if (next.size > 2 * 1024 * 1024) {
      setError("Keep images under 2 MB.");
      return;
    }
    setError(null);
    replacePreview(URL.createObjectURL(next));
    setFile(next);
    setDraft((current) => ({ ...current, removeImage: false }));
  }

  function removeImage() {
    replacePreview(null);
    setFile(null);
    if (fileRef.current) fileRef.current.value = "";
    setDraft((current) => ({
      ...current,
      imagePath: null,
      removeImage: true,
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    let imagePath = draft.removeImage ? null : draft.imagePath;

    if (file) {
      const upload = new FormData();
      upload.set("file", file);
      const uploaded = await uploadAffirmationImage(upload);
      if (!uploaded.ok) {
        setSaving(false);
        setError(uploaded.message);
        return;
      }
      imagePath = uploaded.data.path;
      setDraft((current) => ({
        ...current,
        imagePath,
        removeImage: false,
      }));
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }

    const result = await saveAffirmation({
      id: draft.id,
      body: draft.body,
      scriptureRef: draft.scriptureRef,
      imagePath,
      imageAlt: imagePath ? draft.imageAlt : null,
      status: draft.status,
      publishDate: draft.status === "draft" ? null : draft.publishDate,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    toast({
      title: draft.id ? "Affirmation updated" : "Affirmation saved",
      description:
        draft.status === "draft"
          ? "It is resting in drafts until you choose a day."
          : "Members will see it on the day you chose.",
    });
    setOpen(false);
    replacePreview(null);
    setFile(null);
    router.refresh();
  }

  async function confirmArchive() {
    if (!archiving) return;
    setArchiveSaving(true);
    const result = await archiveAffirmation({ id: archiving.id });
    setArchiveSaving(false);

    if (!result.ok) {
      toast({
        title: "Affirmation not archived",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    toast({ title: "Affirmation archived" });
    setArchiving(null);
    router.refresh();
  }

  function section(title: string, description: string, rows: AdminAffirmation[]) {
    if (rows.length === 0) return null;
    return (
      <AdminSection key={title} title={title} description={description}>
        <ul className="space-y-2">
          {rows.map((item) => (
            <AffirmationRow
              key={item.id}
              item={item}
              today={today}
              onEdit={openEdit}
              onArchive={setArchiving}
            />
          ))}
        </ul>
      </AdminSection>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-6">
        <p className="text-sm leading-relaxed text-ink-soft">
          {items.length === 0
            ? "No affirmations yet. Begin with the next quiet word."
            : `${items.length} ${
                items.length === 1 ? "affirmation" : "affirmations"
              } in the circle.`}
        </p>
        <Button onClick={openCreate}>
          <Plus aria-hidden size={16} />
          New affirmation
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={26} />}
          title="No affirmations yet"
          description="Write one short line for the circle. You can keep it as a draft, schedule it for a day, or leave it in the archive."
          action={
            <Button onClick={openCreate}>
              <Plus aria-hidden size={16} />
              Write the first one
            </Button>
          }
        />
      ) : (
        <>
          {section(
            "Drafts",
            "Words still being held. They are not visible to members.",
            drafts,
          )}
          {section(
            "Shared",
            "Words that have appeared, and past days kept for the archive.",
            shared,
          )}
          {section(
            "Coming up",
            "Scheduled words will reveal themselves on their day.",
            upcoming,
          )}
        </>
      )}

      <Sheet
        open={open}
        onClose={closeForm}
        title={draft.id ? "Edit affirmation" : "New affirmation"}
        description="One short line, a day, and an optional image. Keep it gentle and clear."
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" form="affirmation-form" loading={saving}>
              {draft.status === "draft" ? "Save draft" : "Save affirmation"}
            </Button>
          </div>
        }
      >
        <form id="affirmation-form" onSubmit={submit} className="space-y-5">
          <Textarea
            label="Affirmation"
            value={draft.body}
            onChange={(event) =>
              setDraft((current) => ({ ...current, body: event.target.value }))
            }
            maxLength={400}
            rows={4}
            required
            placeholder="A short word to carry into the day…"
            hint="This is the line members will see under the veil."
            error={fieldErrors.body?.[0]}
          />

          <div>
            <label
              htmlFor="affirmation-reference"
              className="text-sm font-medium text-ink"
            >
              Scripture reference{" "}
              <span className="font-normal text-ink-soft">(optional)</span>
            </label>
            <input
              id="affirmation-reference"
              value={draft.scriptureRef}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  scriptureRef: event.target.value,
                }))
              }
              maxLength={60}
              className={`${inputClass} mt-2`}
              placeholder="Psalm 46:10"
            />
            {fieldErrors.scriptureRef?.[0] ? (
              <p className="mt-1 text-xs text-danger">
                {fieldErrors.scriptureRef[0]}
              </p>
            ) : null}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="affirmation-status"
                className="text-sm font-medium text-ink"
              >
                Status
              </label>
              <select
                id="affirmation-status"
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as AffirmationStatus,
                  }))
                }
                className={`${inputClass} mt-2`}
              >
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="affirmation-date"
                className="text-sm font-medium text-ink"
              >
                Day
              </label>
              <input
                id="affirmation-date"
                type="date"
                value={draft.publishDate}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    publishDate: event.target.value,
                  }))
                }
                disabled={draft.status === "draft"}
                required={draft.status !== "draft"}
                className={`${inputClass} mt-2 disabled:cursor-not-allowed disabled:opacity-55`}
              />
              {fieldErrors.publishDate?.[0] ? (
                <p className="mt-1 text-xs text-danger">
                  {fieldErrors.publishDate[0]}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-line bg-surface-soft/35 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">Image</p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  JPG, PNG, or WebP · under 2 MB. Private to the circle.
                </p>
              </div>
              {visibleImage ? (
                <Button variant="ghost" size="sm" onClick={removeImage}>
                  <X aria-hidden size={14} />
                  Remove
                </Button>
              ) : null}
            </div>

            {visibleImage ? (
              <div className="relative aspect-[16/7] overflow-hidden rounded-xl border border-line bg-canvas">
                <Image
                  src={visibleImage}
                  alt={draft.imageAlt || "Selected affirmation image"}
                  fill
                  sizes="(min-width: 640px) 32rem, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <label
                htmlFor="affirmation-image"
                className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface/60 px-4 py-5 text-center transition hover:border-gold/50 hover:bg-gold-soft/20"
              >
                <ImagePlus aria-hidden size={22} className="text-gold" />
                <span className="text-sm font-medium text-ink">
                  Choose an image
                </span>
                <span className="text-xs text-ink-soft">
                  A quiet background, no faces.
                </span>
              </label>
            )}

            <input
              ref={fileRef}
              id="affirmation-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
              className={cn(
                "block w-full text-xs text-ink-soft file:mr-3 file:min-h-9 file:rounded-full file:border-0 file:bg-sage-soft file:px-3 file:text-xs file:font-medium file:text-ink hover:file:bg-sage/35",
                visibleImage && "sr-only",
              )}
            />
            <p className="text-xs leading-relaxed text-ink-soft">
              {visibleImage
                ? "Choose another file to replace it."
                : "An image is optional. If you add one, describe it below."}
            </p>

            {visibleImage ? (
              <div>
                <label
                  htmlFor="affirmation-alt"
                  className="text-sm font-medium text-ink"
                >
                  Image description
                </label>
                <input
                  id="affirmation-alt"
                  value={draft.imageAlt}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      imageAlt: event.target.value,
                    }))
                  }
                  maxLength={200}
                  required
                  className={`${inputClass} mt-2`}
                  placeholder="Soft morning light through leaves"
                />
                {fieldErrors.imageAlt?.[0] ? (
                  <p className="mt-1 text-xs text-danger">
                    {fieldErrors.imageAlt[0]}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {error ? (
            <p
              role="alert"
              className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger"
            >
              {error}
            </p>
          ) : null}
        </form>
      </Sheet>

      <Sheet
        open={Boolean(archiving)}
        onClose={() => {
          if (!archiveSaving) setArchiving(null);
        }}
        title="Archive this affirmation?"
        description="It will leave the daily flow but stay in the archive and audit log. You can schedule it again later."
      >
        <p className="rounded-xl border border-line bg-surface-soft/60 px-4 py-3 font-serif text-lg text-ink">
          {archiving?.body}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setArchiving(null)}
            disabled={archiveSaving}
          >
            Keep it
          </Button>
          <Button
            variant="danger"
            onClick={confirmArchive}
            loading={archiveSaving}
          >
            <Archive aria-hidden size={15} />
            Archive
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
