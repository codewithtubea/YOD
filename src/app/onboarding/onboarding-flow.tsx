"use client";

import { m } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { AvatarPicker } from "@/components/account/avatar-picker";
import { ProfileFields } from "@/components/account/profile-fields";
import { Halo } from "@/components/art/halo";
import { GuardianAngel } from "@/components/motion/guardian-angel";
import { useMotionPreference } from "@/components/motion/motion-preference";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { completeOnboarding, saveProfile } from "@/lib/account/actions";
import type { MyAccount } from "@/lib/account/types";
import {
  ONBOARDING_PROGRESS,
  ONBOARDING_STEPS,
  detectPlatform,
  isMessagingBrowser,
  parseResumeStep,
  resumeStorageKey,
  stepFromIndex,
  stepIndex,
  type OnboardingStep,
  type Platform,
} from "@/lib/onboarding";

const HOW_IT_WORKS = [
  {
    title: "One chapter a day",
    body: "Open Today, read the passage, and mark it read when you are ready.",
  },
  {
    title: "A thought or a question",
    body: "Share what stayed with you, or ask what you are still wondering about.",
  },
  {
    title: "Prayer and Amen",
    body: "Hold a prayer without your name attached, or say Amen to someone else's.",
  },
  {
    title: "One promise to carry",
    body: "The daily affirmation is a short word to take with you.",
  },
];

const subscribeToHydration = () => () => {};

export function OnboardingFlow({
  account,
  circleName,
}: {
  account: MyAccount;
  circleName: string;
}) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

  if (!hydrated) {
    return <div aria-hidden className="min-h-64" />;
  }

  return <OnboardingExperience account={account} circleName={circleName} />;
}

function OnboardingExperience({
  account,
  circleName,
}: {
  account: MyAccount;
  circleName: string;
}) {
  const key = resumeStorageKey(account.id);
  const [step, setStep] = useState<OnboardingStep>(() => {
    try {
      return stepFromIndex(parseResumeStep(window.localStorage.getItem(key)));
    } catch {
      return "welcome";
    }
  });
  const [name, setName] = useState(account.displayName);
  const [bio, setBio] = useState(account.bio ?? "");
  const [birthday, setBirthday] = useState(account.birthday ?? "");
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>();
  const [platform] = useState<Platform>(() =>
    detectPlatform(window.navigator.userAgent),
  );
  const [messagingBrowser] = useState(() =>
    isMessagingBrowser(window.navigator.userAgent),
  );
  const { reduceMotion } = useMotionPreference();
  const { toast } = useToast();
  const router = useRouter();

  function go(next: OnboardingStep) {
    setStep(next);
    try {
      const index = stepIndex(next);
      if (index >= 0 && index < ONBOARDING_PROGRESS) {
        window.localStorage.setItem(key, String(index));
      }
    } catch {
      return;
    }
  }

  function back() {
    const index = Math.max(0, stepIndex(step) - 1);
    go(stepFromIndex(index));
  }

  async function finish() {
    if (!name.trim()) {
      setErrors({ displayName: ["Add your name."] });
      go("profile");
      return;
    }

    setPending(true);
    setErrors(undefined);

    const profile = await saveProfile({ displayName: name, bio, birthday });
    if (!profile.ok) {
      setPending(false);
      if (profile.fieldErrors) setErrors(profile.fieldErrors);
      toast({
        title: "Let's try that again",
        description: profile.message,
        tone: "danger",
      });
      return;
    }

    const onboarding = await completeOnboarding();
    setPending(false);

    if (!onboarding.ok) {
      toast({
        title: "Almost there",
        description: onboarding.message,
        tone: "danger",
      });
      return;
    }

    try {
      window.localStorage.removeItem(key);
    } catch {
      // A blocked storage area must not block entry.
    }

    go("blessing");
  }

  const frameTransition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="type-caption font-semibold text-gold">Welcome</p>
        <div
          className="flex items-center gap-1.5"
          role="progressbar"
          aria-label="Welcome progress"
          aria-valuemin={1}
          aria-valuemax={ONBOARDING_PROGRESS}
          aria-valuenow={Math.min(stepIndex(step) + 1, ONBOARDING_PROGRESS)}
        >
          {ONBOARDING_STEPS.slice(0, ONBOARDING_PROGRESS).map((item) => (
            <span
              key={item}
              aria-hidden="true"
              className={`size-1.5 rounded-full transition ${
                stepIndex(step) >= stepIndex(item) ? "bg-gold" : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>

      <m.div
        key={step}
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={frameTransition}
      >
        {step === "welcome" ? (
          <div className="space-y-5">
            <GuardianAngel line={`You have been invited into ${circleName}.`} />
            <div>
              <h1 className="type-display text-ink">You are in the circle.</h1>
              <p className="mt-3 max-w-prose text-base leading-relaxed text-ink-soft">
                A small, private place for one chapter a day. Take a moment to
                set how you will appear to the others.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="button" size="lg" onClick={() => go("profile")}>
                Begin
              </Button>
            </div>
          </div>
        ) : null}

        {step === "profile" ? (
          <div className="space-y-5">
            <div>
              <h1 className="type-display text-ink">How should we know you?</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Your name is required. A photo and bio are optional, and you can
                change them any time.
              </p>
            </div>

            <Card>
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
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={back}>
                Back
              </Button>
              <Button
                type="button"
                size="lg"
                onClick={() => go("how")}
                disabled={!name.trim()}
              >
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === "how" ? (
          <div className="space-y-5">
            <div>
              <h1 className="type-display text-ink">A gentle rhythm.</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Four small things, one day at a time. Nothing here is a score or
                a streak.
              </p>
            </div>

            <div className="space-y-3">
              {HOW_IT_WORKS.map((item) => (
                <Card key={item.title} variant="soft" padding="sm">
                  <p className="text-sm font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                    {item.body}
                  </p>
                </Card>
              ))}
            </div>

            <Card variant="gold" padding="sm">
              <p className="text-sm font-medium text-ink">Private by design</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                Your email stays private. Prayer can stay anonymous. Nothing
                here is public or indexed.
              </p>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" onClick={back}>
                Back
              </Button>
              <Button type="button" size="lg" onClick={() => go("install")}>
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === "install" ? (
          <div className="space-y-5">
            <div>
              <h1 className="type-display text-ink">Keep it close.</h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Add the circle to your home screen so today&apos;s reading is
                one tap away.
              </p>
            </div>

            {messagingBrowser ? (
              <Card variant="gold" padding="sm">
                <p className="text-sm font-medium text-ink">
                  Open this page in your browser first.
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  In WhatsApp, tap the menu and choose Open in browser. Then
                  follow the steps below.
                </p>
              </Card>
            ) : null}

            <Card>
              <p className="text-sm font-medium text-ink">
                {platform === "ios"
                  ? "On iPhone or iPad"
                  : platform === "android"
                    ? "On Android"
                    : "On your phone"}
              </p>
              {platform === "ios" ? (
                <ol className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">
                  <li>1. Tap the Share button in Safari.</li>
                  <li>2. Choose Add to Home Screen.</li>
                  <li>3. Tap Add.</li>
                </ol>
              ) : platform === "android" ? (
                <ol className="mt-2 space-y-2 text-sm leading-relaxed text-ink-soft">
                  <li>1. Tap the browser menu (three dots).</li>
                  <li>2. Choose Add to Home screen.</li>
                  <li>3. Tap Add.</li>
                </ol>
              ) : (
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Open your browser menu and choose Add to Home screen. If you
                  do not see it, this browser may not support it yet.
                </p>
              )}
            </Card>

            <p className="text-xs leading-relaxed text-ink-soft">
              You can skip this now and do it later from Help.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={back}
                disabled={pending}
              >
                Back
              </Button>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={finish}
                  disabled={pending}
                >
                  Skip for now
                </Button>
                <Button
                  type="button"
                  size="lg"
                  loading={pending}
                  onClick={finish}
                >
                  Finish
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "blessing" ? (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <Halo size={96} animated={!reduceMotion} />
            </div>
            <div>
              <p className="type-caption font-semibold text-gold">
                A quiet blessing
              </p>
              <h1 className="type-display mt-2 text-ink">You are welcome here.</h1>
              <p className="type-scripture mx-auto mt-4 max-w-md text-ink">
                Grace is already here. You do not have to carry today alone.
              </p>
            </div>
            <Button
              type="button"
              size="lg"
              onClick={() => {
                router.replace("/today");
                router.refresh();
              }}
            >
              Enter the circle
            </Button>
          </div>
        ) : null}
      </m.div>
    </div>
  );
}
