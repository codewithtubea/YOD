"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { OpenBook } from "@/components/art/open-book";
import { loadMorePosts } from "@/lib/study/actions";
import type { PostView, TodayData, Viewer } from "@/lib/study/types";
import { Composer } from "./composer";
import { PostCard } from "./post-card";

export function Discussion({
  initial,
  viewer,
  catchingUp = false,
}: {
  initial: TodayData;
  viewer: Viewer;
  catchingUp?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [posts, setPosts] = useState(initial.posts);
  const [hasMore, setHasMore] = useState(initial.hasMore);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [previousInitial, setPreviousInitial] = useState(initial);

  if (previousInitial !== initial) {
    setPreviousInitial(initial);
    setPosts(initial.posts);
    setHasMore(initial.hasMore);
    setNextCursor(initial.nextCursor);
  }

  useEffect(() => {
    function refreshVisible() {
      if (document.visibilityState === "visible") router.refresh();
    }

    window.addEventListener("focus", refreshVisible);
    const timer = window.setInterval(refreshVisible, 60_000);

    return () => {
      window.removeEventListener("focus", refreshVisible);
      window.clearInterval(timer);
    };
  }, [router]);

  function addOptimistic(kind: "thought" | "question", body: string) {
    const id = `optimistic-${Date.now()}`;
    const optimistic: PostView = {
      id,
      planDate: initial.plan?.date ?? "",
      authorId: viewer.userId,
      author: {
        id: viewer.userId,
        displayName: viewer.displayName,
        avatarUrl: null,
      },
      kind,
      body,
      status: "open",
      answeredReplyId: null,
      editedAt: null,
      createdAt: new Date().toISOString(),
      amenCount: 0,
      viewerAmen: false,
      replyCount: 0,
      replies: [],
    };
    setPosts((current) => [optimistic, ...current]);
    return id;
  }

  function rollbackOptimistic(id: string) {
    setPosts((current) => current.filter((post) => post.id !== id));
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const result = await loadMorePosts({
      planDate: initial.plan?.date ?? "",
      cursor: nextCursor,
    });
    setLoadingMore(false);

    if (!result.ok) {
      toast({
        title: "Couldn't load more",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    setPosts((current) => {
      const known = new Set(current.map((post) => post.id));
      return [...current, ...result.data.posts.filter((post) => !known.has(post.id))];
    });
    setHasMore(result.data.hasMore);
    setNextCursor(result.data.nextCursor);
  }

  return (
    <div className="space-y-5">
      <Composer
        planDate={initial.plan?.date ?? ""}
        catchingUp={catchingUp}
        onOptimistic={addOptimistic}
        onRollback={rollbackOptimistic}
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={<OpenBook size={24} />}
          eyebrow="The conversation is open"
          title="No thoughts yet"
          description="Share what stayed with you, or ask what you're still wondering about."
        />
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              viewer={viewer}
              canModerate={viewer.role === "admin"}
              catchingUp={catchingUp}
              showThreadLink
            />
          ))}
        </div>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="quiet" onClick={loadMore} loading={loadingMore}>
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
