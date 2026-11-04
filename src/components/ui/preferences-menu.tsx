"use client";

import Link from "next/link";

import { useTheme } from "@/components/theme-provider";
import { useMotionPreference } from "@/components/motion/motion-preference";
import { useTextSize } from "@/components/text-size-provider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveMemberSettings } from "@/lib/account/actions";
import type { MemberSettingsInput } from "@/lib/validation/account";

function SunIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 15.2A8.2 8.2 0 0 1 8.8 4A8.5 8.5 0 1 0 20 15.2Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
    >
      <path d="M4 7h10M18 7h2M4 17h3M11 17h9" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </svg>
  );
}

export function PreferencesMenu() {
  const { mode, resolved, setMode } = useTheme();
  const {
    reduceMotion,
    preference,
    setReduceMotion,
    clearPreference,
  } = useMotionPreference();
  const { textSize, setTextSize } = useTextSize();
  const { toast } = useToast();

  function persist(next: MemberSettingsInput) {
    void saveMemberSettings(next).then((result) => {
      if (result.ok) return;
      if (result.message.includes("isn't ready")) return;
      toast({
        title: "Could not save your display choice",
        description: result.message,
        tone: "danger",
      });
    });
  }

  return (
    <details className="group relative">
      <summary
        className="inline-flex size-11 cursor-pointer list-none items-center justify-center rounded-full text-ink-soft transition hover:bg-surface-soft hover:text-ink [&::-webkit-details-marker]:hidden"
        aria-label="Display and motion preferences"
        title="Preferences"
      >
        <SlidersIcon />
      </summary>

      <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-soft border border-line bg-surface p-4 shadow-2xl shadow-forest/15">
        <p className="type-caption font-semibold text-gold">Appearance</p>
        <p className="mt-1 text-xs text-ink-soft">
          Currently {mode === "system" ? `system (${resolved})` : mode}.
        </p>
        <SegmentedControl
          label="Theme"
          value={mode}
          onChange={(value) => {
            const next = value as "system" | "light" | "dark";
            setMode(next);
            persist({ theme: next, reduceMotion, textSize });
          }}
          className="mt-3"
          options={[
            { id: "light", label: "Light", icon: <SunIcon /> },
            { id: "system", label: "System", icon: <SystemIcon /> },
            { id: "dark", label: "Dark", icon: <MoonIcon /> },
          ]}
        />

        <div className="mt-5 border-t border-line pt-4">
          <Switch
            label="Reduce motion"
            description="Ambient light rests. All content remains."
            checked={reduceMotion}
            onCheckedChange={(value) => {
              setReduceMotion(value);
              persist({ theme: mode, reduceMotion: value, textSize });
            }}
          />

          {preference !== null ? (
            <button
              type="button"
              onClick={() => {
                clearPreference();
                persist({
                  theme: mode,
                  reduceMotion: false,
                  textSize,
                });
              }}
              className="mt-3 text-xs font-medium text-link underline-offset-4 hover:underline"
            >
              Use my device setting
            </button>
          ) : null}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">Text size</p>
          <SegmentedControl
            label="Text size"
            value={textSize}
            onChange={(value) => {
              const next = value === "large" ? "large" : "default";
              setTextSize(next);
              persist({ theme: mode, reduceMotion, textSize: next });
            }}
            className="mt-2"
            options={[
              { id: "default", label: "Default" },
              { id: "large", label: "Larger" },
            ]}
          />
        </div>

        <Link
          href="/settings"
          className="mt-4 inline-flex min-h-9 items-center text-xs font-medium text-link underline-offset-4 hover:underline"
        >
          All settings
        </Link>
      </div>
    </details>
  );
}
