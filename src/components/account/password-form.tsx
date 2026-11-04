"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { changeMyPassword } from "@/lib/account/actions";

const inputClass =
  "block min-h-11 w-full rounded-soft border border-line bg-surface px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

type FieldErrors = Record<string, string[]>;

export function MemberPasswordForm() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const result = await changeMyPassword({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setOpen(false);
    toast({
      title: "Password changed",
      description: "Use the new password the next time you sign in.",
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="quiet"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Change password
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4 border-t border-line pt-4">
      <div>
        <label htmlFor="member-current-password" className="text-sm font-medium text-ink">
          Current password
        </label>
        <input
          id="member-current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          className={`${inputClass} mt-2`}
        />
        {fieldErrors.currentPassword?.[0] ? (
          <p className="mt-1 text-xs text-danger">
            {fieldErrors.currentPassword[0]}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="member-new-password" className="text-sm font-medium text-ink">
            New password
          </label>
          <input
            id="member-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            minLength={8}
            className={`${inputClass} mt-2`}
          />
          {fieldErrors.newPassword?.[0] ? (
            <p className="mt-1 text-xs text-danger">
              {fieldErrors.newPassword[0]}
            </p>
          ) : null}
        </div>
        <div>
          <label
            htmlFor="member-confirm-password"
            className="text-sm font-medium text-ink"
          >
            Confirm new password
          </label>
          <input
            id="member-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
            className={`${inputClass} mt-2`}
          />
          {fieldErrors.confirmPassword?.[0] ? (
            <p className="mt-1 text-xs text-danger">
              {fieldErrors.confirmPassword[0]}
            </p>
          ) : null}
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-soft">
        Use at least 8 characters. Never reuse a password from another service.
      </p>

      {error ? (
        <p
          role="alert"
          className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={saving}>
          Save new password
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={saving}
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
