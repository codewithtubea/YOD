"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  deleteMyAccount,
  requestAccountDeletionCode,
  verifyAccountDeletionCode,
} from "@/lib/account/actions";

type Step = "choose" | "code" | "confirm";

export function DeleteAccountFlow({ email }: { email: string }) {
  const [step, setStep] = useState<Step>("choose");
  const [keepContributions, setKeepContributions] = useState(true);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [proofId, setProofId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  async function requestCode() {
    setPending(true);
    setError(null);
    const result = await requestAccountDeletionCode();
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setChallengeId(result.data.challengeId);
    setCode("");
    setStep("code");
    toast({
      title: "Check your email",
      description: "Enter the 6-digit code to continue.",
      tone: "gold",
    });
  }

  async function verifyCode() {
    if (!challengeId) return;
    setPending(true);
    setError(null);

    const result = await verifyAccountDeletionCode({ challengeId, code });
    setPending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setProofId(result.data.proofId);
    setStep("confirm");
  }

  async function remove() {
    if (!proofId) return;
    setPending(true);
    setError(null);

    const result = await deleteMyAccount({
      proofId,
      keepContributions,
      confirmation,
    });

    if (!result.ok) {
      setPending(false);
      setError(result.message);
      return;
    }

    router.replace("/sign-in?deleted=1");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <Card variant="gold">
        <p className="text-sm font-medium text-ink">Before you go</p>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          You can download your data first. It includes your profile,
          reflections, prayers, saved affirmations, settings, and messages to
          admins.
        </p>
        <Link
          href="/account/export"
          className="mt-3 inline-flex min-h-9 items-center text-xs font-medium text-link underline-offset-4 hover:underline"
        >
          Download your data
        </Link>
      </Card>

      <Card>
        {step === "choose" ? (
          <div className="space-y-5">
            <div>
              <h2 className="type-heading text-ink">
                Choose what happens to your reflections
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Prayers, updates, saved affirmations, settings, and your profile
                are always removed. Your reflections and replies can stay
                without your name, or be erased with the rest.
              </p>
            </div>

            <Switch
              label="Keep my reflections without my name"
              description="Recommended. They stay helpful to the circle, but show “Former member.”"
              checked={keepContributions}
              onCheckedChange={setKeepContributions}
            />

            <p className="text-xs leading-relaxed text-ink-soft">
              We will send a one-time code to <strong>{email}</strong>. Your
              email is only used to confirm this deletion.
            </p>

            <Button
              type="button"
              variant="danger"
              loading={pending}
              onClick={requestCode}
            >
              Email me a code
            </Button>
          </div>
        ) : null}

        {step === "code" ? (
          <div className="space-y-5">
            <div>
              <h2 className="type-heading text-ink">Confirm your email</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Enter the 6-digit code sent to <strong>{email}</strong>.
              </p>
            </div>

            <div>
              <label
                htmlFor="delete-code"
                className="text-sm font-medium text-ink"
              >
                Verification code
              </label>
              <input
                id="delete-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                maxLength={6}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="mt-2 block min-h-12 w-40 rounded-soft border border-line bg-surface px-3.5 text-center font-mono text-lg tracking-[0.3em] text-ink outline-none transition focus:border-focus focus:ring-2 focus:ring-focus/15"
                placeholder="000000"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="danger"
                loading={pending}
                disabled={code.length !== 6}
                onClick={verifyCode}
              >
                Verify code
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={requestCode}
              >
                Send a new code
              </Button>
            </div>
          </div>
        ) : null}

        {step === "confirm" ? (
          <div className="space-y-5">
            <div>
              <h2 className="type-heading text-ink">Delete this account?</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                This cannot be undone. Your name, photo, bio, email, settings,
                and private activity will be removed.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {keepContributions
                  ? "Your reflections and replies will remain without your name."
                  : "Your reflections and replies will also be removed."}
              </p>
            </div>

            <div>
              <label
                htmlFor="delete-confirmation"
                className="text-sm font-medium text-ink"
              >
                Type DELETE to confirm
              </label>
              <input
                id="delete-confirmation"
                value={confirmation}
                autoComplete="off"
                onChange={(event) => setConfirmation(event.target.value)}
                className="mt-2 block min-h-11 w-full rounded-soft border border-line bg-surface px-3.5 text-sm uppercase tracking-wide text-ink outline-none transition focus:border-danger focus:ring-2 focus:ring-danger/15"
                placeholder="DELETE"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="danger"
                loading={pending}
                disabled={confirmation !== "DELETE"}
                onClick={remove}
              >
                Delete my account
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => router.push("/settings")}
              >
                Keep my account
              </Button>
            </div>
          </div>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="mt-4 border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger"
          >
            {error}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
