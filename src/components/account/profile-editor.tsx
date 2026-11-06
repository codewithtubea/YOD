"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AvatarPicker } from "@/components/account/avatar-picker";
import { ProfileFields } from "@/components/account/profile-fields";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useToast } from "@/components/ui/toast";
import { saveProfile } from "@/lib/account/actions";
import type { MyAccount } from "@/lib/account/types";

export function ProfileEditor({
  account,
  onPreview,
  onRollback,
}: {
  account: MyAccount;
  onPreview?: (next: { displayName: string; bio: string | null }) => void;
  onRollback?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(account.displayName);
  const [bio, setBio] = useState(account.bio ?? "");
  const [birthday, setBirthday] = useState(account.birthday ?? "");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const { toast } = useToast();
  const router = useRouter();

  async function submit() {
    const trimmedName = name.trim();
    const trimmedBio = bio.trim();
    if (trimmedName && trimmedName.length <= 50 && trimmedBio.length <= 160) {
      onPreview?.({
        displayName: trimmedName,
        bio: trimmedBio || null,
      });
    }

    setPending(true);
    setErrors(undefined);

    const result = await saveProfile({ displayName: name, bio, birthday });
    setPending(false);

    if (!result.ok) {
      onRollback?.();
      if (result.fieldErrors) setErrors(result.fieldErrors);
      toast({
        title: "Profile not saved",
        description: result.message,
        tone: "danger",
      });
      return;
    }

    toast({ title: "Profile updated", tone: "gold" });
    setOpen(false);
    router.refresh();
  }

  function close() {
    if (pending) return;
    setName(account.displayName);
    setBio(account.bio ?? "");
    setBirthday(account.birthday ?? "");
    setErrors(undefined);
    onRollback?.();
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="quiet" size="sm" onClick={() => setOpen(true)}>
        Edit profile
      </Button>

      <Sheet
        open={open}
        onClose={close}
        title="Edit your profile"
        description="Your name and bio help the circle know you."
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="button" loading={pending} onClick={submit}>
              Save profile
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <AvatarPicker
            userId={account.id}
            name={name || account.displayName}
            initialUrl={account.avatarUrl}
          />

          <div className="border-t border-line pt-5">
            <ProfileFields
              name={name}
              bio={bio}
              birthday={birthday}
              onNameChange={setName}
              onBioChange={setBio}
              onBirthdayChange={setBirthday}
              errors={errors}
              disabled={pending}
            />
          </div>
        </div>
      </Sheet>
    </>
  );
}
