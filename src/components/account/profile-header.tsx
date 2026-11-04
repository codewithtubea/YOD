"use client";

import { useState } from "react";

import { ProfileEditor } from "@/components/account/profile-editor";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { MyAccount } from "@/lib/account/types";

function joinedDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function ProfileHeader({ account }: { account: MyAccount }) {
  const [preview, setPreview] = useState({
    displayName: account.displayName,
    bio: account.bio,
  });

  return (
    <Card>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar
            name={preview.displayName}
            src={account.avatarUrl}
            size="lg"
            className="size-16 text-lg"
          />
          <div className="min-w-0">
            <h2 className="font-serif text-2xl text-ink">
              {preview.displayName}
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              In the circle since {joinedDate(account.joinedAt)}
            </p>
            <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-soft">
              {preview.bio || "No bio yet."}
            </p>
          </div>
        </div>
        <ProfileEditor
          account={account}
          onPreview={(next) => setPreview(next)}
          onRollback={() =>
            setPreview({ displayName: account.displayName, bio: account.bio })
          }
        />
      </div>
    </Card>
  );
}
