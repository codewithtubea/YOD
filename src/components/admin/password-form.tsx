"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";

import { AdminSection } from "@/components/admin/page";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { changeAdminPassword } from "@/lib/admin/actions";

const inputClass =
  "block min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

type FieldErrors = Record<string, string[]>;

export function AdminPasswordForm() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const result = await changeAdminPassword({
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
    toast({
      title: "Password changed",
      description: "Use the new password the next time you sign in.",
    });
  }

  return (
    <AdminSection
      title="Your password"
      description="Change the password for this administrator account. Your current session stays signed in."
    >
      <form onSubmit={submit} className="max-w-xl space-y-5">
        <div>
          <label
            htmlFor="current-password"
            className="text-sm font-medium text-ink"
          >
            Current password
          </label>
          <input
            id="current-password"
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

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="new-password"
              className="text-sm font-medium text-ink"
            >
              New password
            </label>
            <input
              id="new-password"
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
              htmlFor="confirm-password"
              className="text-sm font-medium text-ink"
            >
              Confirm new password
            </label>
            <input
              id="confirm-password"
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
          Use at least 8 characters. Never reuse a password from another
          service.
        </p>

        {error ? (
          <p
            role="alert"
            className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}

        <Button type="submit" loading={saving}>
          <KeyRound aria-hidden size={16} />
          Change password
        </Button>
      </form>
    </AdminSection>
  );
}
