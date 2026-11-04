"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { MemberCard } from "@/components/account/member-card";
import { AmenButton } from "@/components/motion/amen-button";
import { AnsweredReveal } from "@/components/motion/answered-reveal";
import { ThreadOfLight } from "@/components/motion/thread-of-light";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  createReply,
  editPost,
  editReply,
  hidePost,
  hideReply,
  markQuestionAnswered,
  softDeletePost,
  softDeleteReply,
  toggleAmen,
} from "@/lib/study/actions";
import type { PostView, ReplyView, Viewer } from "@/lib/study/types";
import { RelativeTime } from "./relative-time";
import { ReportContent } from "./report-content";

type PostCardProps = {
  post: PostView;
  viewer: Viewer;
  canModerate?: boolean;
  catchingUp?: boolean;
  showThreadLink?: boolean;
};

function ActionMenu({ children }: { children: ReactNode }) {
  return (
    <details className="group relative">
      <summary
        aria-label="Post actions"
        className="inline-flex size-9 cursor-pointer list-none items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-soft hover:text-ink [&::-webkit-details-marker]:hidden"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="size-4"
          fill="currentColor"
        >
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </summary>
      <div className="absolute right-0 top-full z-30 mt-1 w-52 rounded-soft border border-line bg-surface p-1.5 shadow-2xl shadow-forest/15">
        {children}
      </div>
    </details>
  );
}

function MenuButton({
  children,
  onClick,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-10 w-full items-center rounded-[calc(var(--radius-soft)-0.25rem)] px-3 text-left text-sm transition hover:bg-surface-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        danger ? "text-danger" : "text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function PostCard({
  post,
  viewer,
  canModerate = false,
  catchingUp = false,
  showThreadLink = false,
}: PostCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [local, setLocal] = useState(post);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState(post.body);
  const [savingEdit, setSavingEdit] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [hideReason, setHideReason] = useState("");
  const [hiding, setHiding] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteTimer = useRef<number | null>(null);
  const [previousPost, setPreviousPost] = useState(post);

  if (previousPost !== post) {
    setPreviousPost(post);
    setLocal(post);
  }

  function openEdit() {
    setEditBody(local.body);
    setEditOpen(true);
  }

  const optimistic = local.id.startsWith("optimistic-");
  const isAuthor = local.authorId === viewer.userId;
  const canMarkAnswered =
    local.kind === "question" &&
    local.status === "open" &&
    (isAuthor || viewer.role === "admin");
  const canEdit = isAuthor && !optimistic;
  const canDelete = isAuthor && !optimistic;
  const canHide = canModerate && !optimistic;

  async function handleAmen(next: boolean) {
    if (optimistic) return;
    const previous = {
      amenCount: local.amenCount,
      viewerAmen: local.viewerAmen,
    };

    setLocal((current) => ({
      ...current,
      viewerAmen: next,
      amenCount: Math.max(0, current.amenCount + (next ? 1 : -1)),
    }));

    const result = await toggleAmen({
      targetType: "post",
      targetId: local.id,
      active: local.viewerAmen,
    });

    if (!result.ok) {
      setLocal((current) => ({ ...current, ...previous }));
      toast({
        title: "Amen wasn't saved",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    router.refresh();
  }

  async function shareReply() {
    const trimmed = replyBody.trim();
    if (!trimmed || replying) return;

    const optimisticReply: ReplyView = {
      id: `optimistic-reply-${Date.now()}`,
      postId: local.id,
      parentReplyId: null,
      authorId: viewer.userId,
      author: {
        id: viewer.userId,
        displayName: viewer.displayName,
        avatarUrl: null,
      },
      body: trimmed,
      editedAt: null,
      createdAt: new Date().toISOString(),
      amenCount: 0,
      viewerAmen: false,
    };

    setLocal((current) => ({
      ...current,
      replies: [...current.replies, optimisticReply],
      replyCount: current.replyCount + 1,
    }));
    setReplyBody("");
    setReplying(true);

    const result = await createReply({
      postId: local.id,
      body: trimmed,
    });

    if (!result.ok) {
      setLocal((current) => ({
        ...current,
        replies: current.replies.filter(
          (reply) => reply.id !== optimisticReply.id,
        ),
        replyCount: Math.max(0, current.replyCount - 1),
      }));
      setReplyBody(trimmed);
      setReplying(false);
      toast({
        title: "Your reply is still here",
        description: result.message,
        tone: "danger",
        duration: 6500,
      });
      return;
    }

    setReplying(false);
    setReplyOpen(false);
    router.refresh();
  }

  async function saveEdit() {
    const trimmed = editBody.trim();
    if (!trimmed || savingEdit) return;
    setSavingEdit(true);
    const result = await editPost({ id: local.id, body: trimmed });
    setSavingEdit(false);

    if (!result.ok) {
      toast({
        title: "The edit wasn't saved",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    setEditOpen(false);
    router.refresh();
  }

  function requestDelete() {
    if (!canDelete || deleting) return;
    setDeleting(true);

    toast({
      title: "Post removed",
      description: "You have a moment to undo.",
      tone: "neutral",
      duration: 8200,
      action: {
        label: "Undo",
        onClick: () => {
          if (deleteTimer.current) {
            window.clearTimeout(deleteTimer.current);
            deleteTimer.current = null;
          }
          setDeleting(false);
        },
      },
    });

    deleteTimer.current = window.setTimeout(async () => {
      deleteTimer.current = null;
      const result = await softDeletePost(local.id);
      if (!result.ok) {
        setDeleting(false);
        toast({
          title: "The post wasn't removed",
          description: result.message,
          tone: "danger",
        });
        return;
      }
      router.refresh();
    }, 7900);
  }

  async function saveHide() {
    const reason = hideReason.trim();
    if (!reason || hiding) return;
    setHiding(true);
    const result = await hidePost({ id: local.id, reason });
    setHiding(false);

    if (!result.ok) {
      toast({
        title: "The post wasn't hidden",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    setHideOpen(false);
    setHideReason("");
    setDeleting(true);
    router.refresh();
  }

  async function markAnswered(replyId?: string) {
    const result = await markQuestionAnswered({
      postId: local.id,
      replyId: replyId ?? null,
    });

    if (!result.ok) {
      toast({
        title: "The question wasn't updated",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    router.refresh();
  }

  if (deleting) return null;

  return (
    <article
      id={`post-${local.id}`}
      className="relative scroll-mt-24"
      aria-label={`${local.kind === "question" ? "Question" : "Thought"} from ${local.author.displayName}`}
    >
      <AnsweredReveal answered={local.status === "answered"}>
        <div className="rounded-card border border-line bg-surface p-5 shadow-soft sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <MemberCard
              memberId={local.author.id}
              name={local.author.displayName}
              className="gap-3"
            >
              <Avatar
                name={local.author.displayName}
                src={local.author.avatarUrl}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">
                  {local.author.displayName}
                </p>
                <p className="text-xs text-ink-soft">
                  <RelativeTime value={local.createdAt} />
                  {local.editedAt ? " · edited" : ""}
                </p>
              </div>
            </MemberCard>

            <div className="flex shrink-0 items-center gap-1">
              {optimistic ? (
                <Badge tone="neutral">Sending…</Badge>
              ) : (
                <>
                  {catchingUp ? <Badge tone="sage">Catching up</Badge> : null}
                  {local.kind === "question" ? (
                    <Badge tone={local.status === "answered" ? "gold" : "sage"}>
                      {local.status === "answered" ? "Answered" : "Question"}
                    </Badge>
                  ) : null}
                  {canEdit || canDelete || canHide || !isAuthor ? (
                    <ActionMenu>
                      {canEdit ? (
                        <MenuButton onClick={openEdit}>
                          Edit
                        </MenuButton>
                      ) : null}
                      {canDelete ? (
                        <MenuButton onClick={requestDelete} danger>
                          Delete
                        </MenuButton>
                      ) : null}
                      {canHide ? (
                        <MenuButton onClick={() => setHideOpen(true)}>
                          Hide with reason
                        </MenuButton>
                      ) : null}
                      {!isAuthor && !canModerate ? (
                        <MenuButton onClick={() => setReportOpen(true)}>
                          Report
                        </MenuButton>
                      ) : null}
                    </ActionMenu>
                  ) : null}
                </>
              )}
            </div>
          </div>

          <p className="mt-4 whitespace-pre-wrap break-words text-[0.9375rem] leading-relaxed text-ink">
            {local.body}
          </p>

          {local.status === "answered" ? (
            <p className="mt-3 text-xs font-medium text-gold">
              This question has been marked answered.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <AmenButton
              active={local.viewerAmen}
              count={local.amenCount}
              disabled={optimistic}
              onToggle={handleAmen}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyOpen((current) => !current)}
              disabled={optimistic || deleting}
              aria-expanded={replyOpen}
            >
              {replyOpen ? "Cancel reply" : `Reply${local.replyCount ? ` · ${local.replyCount}` : ""}`}
            </Button>
            {canMarkAnswered ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAnswered()}
              >
                Mark answered
              </Button>
            ) : null}
            {showThreadLink && local.kind === "question" ? (
              <Link
                href={`/today/thread/${local.id}`}
                className="inline-flex min-h-9 items-center px-3 text-xs font-medium text-link underline-offset-4 hover:underline"
              >
                Open full thread
              </Link>
            ) : null}
          </div>

          {replyOpen ? (
            <div className="mt-4 rounded-soft border border-line bg-surface-soft/55 p-4">
              <Textarea
                label="Your reply"
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                maxLength={1000}
                placeholder="A gentle word…"
                disabled={replying}
                className="min-h-24 bg-surface"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyOpen(false)}
                  disabled={replying}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={shareReply}
                  loading={replying}
                  disabled={!replyBody.trim()}
                >
                  Reply
                </Button>
              </div>
            </div>
          ) : null}

          {local.replies.length > 0 ? (
            <div className="mt-5">
              <ThreadOfLight className="h-8" animated={false} />
              <div className="ml-3 space-y-4 border-l border-gold/25 pl-4">
                {local.replies
                  .filter((reply) => !reply.parentReplyId)
                  .map((reply) => (
                    <div key={reply.id} className="space-y-3">
                      <ReplyCard
                        reply={reply}
                        viewer={viewer}
                        canModerate={canModerate}
                        canMarkAnswered={canMarkAnswered}
                        onMarkAnswered={() => markAnswered(reply.id)}
                        onChanged={() => router.refresh()}
                      />
                      {local.replies
                        .filter(
                          (child) => child.parentReplyId === reply.id,
                        )
                        .map((child) => (
                          <div key={child.id} className="ml-4">
                            <ReplyCard
                              reply={child}
                              viewer={viewer}
                              canModerate={canModerate}
                              onChanged={() => router.refresh()}
                            />
                          </div>
                        ))}
                    </div>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      </AnsweredReveal>

      <Sheet
        open={editOpen}
        onClose={() => {
          if (!savingEdit) setEditOpen(false);
        }}
        title="Edit your words"
        description="Edits are honest. The circle will see that this was edited."
      >
        <Textarea
          label="Your post"
          value={editBody}
          onChange={(event) => setEditBody(event.target.value)}
          maxLength={1000}
          disabled={savingEdit}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setEditOpen(false)}
            disabled={savingEdit}
          >
            Cancel
          </Button>
          <Button
            onClick={saveEdit}
            loading={savingEdit}
            disabled={!editBody.trim()}
          >
            Save edit
          </Button>
        </div>
      </Sheet>

      <ReportContent
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="post"
        targetId={local.id}
      />

      <Sheet
        open={hideOpen}
        onClose={() => {
          if (!hiding) setHideOpen(false);
        }}
        title="Hide this post"
        description="It will disappear from the circle feed. The author will not be told."
      >
        <Textarea
          label="Reason for hiding"
          value={hideReason}
          onChange={(event) => setHideReason(event.target.value)}
          maxLength={300}
          placeholder="For example: shared private information"
          disabled={hiding}
          className="min-h-24"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => setHideOpen(false)}
            disabled={hiding}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={saveHide}
            loading={hiding}
            disabled={!hideReason.trim()}
          >
            Hide post
          </Button>
        </div>
      </Sheet>
    </article>
  );
}

function ReplyCard({
  reply,
  viewer,
  canModerate,
  canMarkAnswered,
  onMarkAnswered,
  onChanged,
}: {
  reply: ReplyView;
  viewer: Viewer;
  canModerate: boolean;
  canMarkAnswered?: boolean;
  onMarkAnswered?: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [local, setLocal] = useState(reply);
  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState(reply.body);
  const [saving, setSaving] = useState(false);
  const [hideOpen, setHideOpen] = useState(false);
  const [hideReason, setHideReason] = useState("");
  const [hiding, setHiding] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deleteTimer = useRef<number | null>(null);
  const [previousReply, setPreviousReply] = useState(reply);

  if (previousReply !== reply) {
    setPreviousReply(reply);
    setLocal(reply);
  }

  function openEdit() {
    setEditBody(local.body);
    setEditOpen(true);
  }

  const optimistic = local.id.startsWith("optimistic-");
  const isAuthor = local.authorId === viewer.userId;

  async function handleAmen(next: boolean) {
    if (optimistic) return;
    const previous = {
      amenCount: local.amenCount,
      viewerAmen: local.viewerAmen,
    };
    setLocal((current) => ({
      ...current,
      viewerAmen: next,
      amenCount: Math.max(0, current.amenCount + (next ? 1 : -1)),
    }));

    const result = await toggleAmen({
      targetType: "reply",
      targetId: local.id,
      active: local.viewerAmen,
    });

    if (!result.ok) {
      setLocal((current) => ({ ...current, ...previous }));
      toast({
        title: "Amen wasn't saved",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    onChanged();
  }

  async function saveEdit() {
    const trimmed = editBody.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const result = await editReply({ id: local.id, body: trimmed });
    setSaving(false);
    if (!result.ok) {
      toast({
        title: "The edit wasn't saved",
        description: result.message,
        tone: "danger",
      });
      return;
    }
    setEditOpen(false);
    onChanged();
  }

  function requestDelete() {
    if (!isAuthor || optimistic || deleting) return;
    setDeleting(true);
    toast({
      title: "Reply removed",
      description: "You have a moment to undo.",
      duration: 8200,
      action: {
        label: "Undo",
        onClick: () => {
          if (deleteTimer.current) {
            window.clearTimeout(deleteTimer.current);
            deleteTimer.current = null;
          }
          setDeleting(false);
        },
      },
    });

    deleteTimer.current = window.setTimeout(async () => {
      deleteTimer.current = null;
      const result = await softDeleteReply(local.id);
      if (!result.ok) {
        setDeleting(false);
        toast({
          title: "The reply wasn't removed",
          description: result.message,
          tone: "danger",
        });
        return;
      }
      onChanged();
    }, 7900);
  }

  async function saveHide() {
    const reason = hideReason.trim();
    if (!reason || hiding) return;
    setHiding(true);
    const result = await hideReply({ id: local.id, reason });
    setHiding(false);
    if (!result.ok) {
      toast({
        title: "The reply wasn't hidden",
        description: result.message,
        tone: "danger",
      });
      return;
    }
    setHideOpen(false);
    setDeleting(true);
    onChanged();
  }

  if (deleting) return null;

  return (
    <div
      id={`reply-${local.id}`}
      className="scroll-mt-24 rounded-soft bg-surface-soft/55 px-4 py-3"
    >
      <div className="flex items-start justify-between gap-3">
        <MemberCard
          memberId={local.author.id}
          name={local.author.displayName}
          className="gap-2"
        >
          <Avatar
            name={local.author.displayName}
            src={local.author.avatarUrl}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-ink">
              {local.author.displayName}
            </p>
            <p className="text-[0.6875rem] text-ink-soft">
              <RelativeTime value={local.createdAt} />
              {local.editedAt ? " · edited" : ""}
            </p>
          </div>
        </MemberCard>

        {!optimistic ? (
          <ActionMenu>
            {isAuthor ? (
              <MenuButton onClick={openEdit}>Edit</MenuButton>
            ) : null}
            {isAuthor ? (
              <MenuButton onClick={requestDelete} danger>
                Delete
              </MenuButton>
            ) : null}
            {canModerate ? (
              <MenuButton onClick={() => setHideOpen(true)}>
                Hide with reason
              </MenuButton>
            ) : null}
            {!isAuthor && !canModerate ? (
              <MenuButton onClick={() => setReportOpen(true)}>
                Report
              </MenuButton>
            ) : null}
          </ActionMenu>
        ) : null}
      </div>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">
        {local.body}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1">
        <AmenButton
          active={local.viewerAmen}
          count={local.amenCount}
          disabled={optimistic}
          onToggle={handleAmen}
          className="min-h-9 px-3 text-xs"
        />
        {canMarkAnswered && onMarkAnswered && !optimistic ? (
          <Button variant="ghost" size="sm" onClick={onMarkAnswered}>
            Mark this as the answer
          </Button>
        ) : null}
      </div>

      <Sheet
        open={editOpen}
        onClose={() => {
          if (!saving) setEditOpen(false);
        }}
        title="Edit your reply"
      >
        <Textarea
          label="Your reply"
          value={editBody}
          onChange={(event) => setEditBody(event.target.value)}
          maxLength={1000}
          disabled={saving}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={saveEdit}
            loading={saving}
            disabled={!editBody.trim()}
          >
            Save
          </Button>
        </div>
      </Sheet>

      <ReportContent
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="reply"
        targetId={local.id}
      />

      <Sheet
        open={hideOpen}
        onClose={() => {
          if (!hiding) setHideOpen(false);
        }}
        title="Hide this reply"
        description="It will disappear from the circle feed."
      >
        <Textarea
          label="Reason for hiding"
          value={hideReason}
          onChange={(event) => setHideReason(event.target.value)}
          maxLength={300}
          className="min-h-24"
          disabled={hiding}
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setHideOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={saveHide}
            loading={hiding}
            disabled={!hideReason.trim()}
          >
            Hide reply
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
