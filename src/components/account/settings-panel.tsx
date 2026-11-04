"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import { ExportButton } from "@/components/account/export-button";
import { MemberPasswordForm } from "@/components/account/password-form";
import { SignOutEverywhere } from "@/components/account/sign-out-everywhere";
import { useMotionPreference } from "@/components/motion/motion-preference";
import { useTextSize } from "@/components/text-size-provider";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { saveMemberSettings } from "@/lib/account/actions";
import type { MemberSettings } from "@/lib/account/types";
import {
  APPEARANCE_SETTINGS,
  NOTIFICATION_SETTINGS,
  SETTINGS_SECTIONS,
  type NotificationSettingKey,
  type SettingsSectionId,
} from "@/lib/settings/registry";
import type { MemberSettingsInput } from "@/lib/validation/account";

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: SettingsSectionId;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <Card>
        <h2 id={`${id}-heading`} className="type-heading text-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
        <div className="mt-5">{children}</div>
      </Card>
    </section>
  );
}

export function SettingsPanel({
  initialSettings,
  email,
}: {
  initialSettings: MemberSettings;
  email: string;
}) {
  const { mode, setMode } = useTheme();
  const { reduceMotion, setReduceMotion } = useMotionPreference();
  const { textSize, setTextSize } = useTextSize();
  const [notifications, setNotifications] = useState({
    notifyReplies: initialSettings.notifyReplies,
    notifyAmens: initialSettings.notifyAmens,
    notifyAnswered: initialSettings.notifyAnswered,
    notifyEncouragements: initialSettings.notifyEncouragements,
  });
  const { toast } = useToast();

  function persist(next: Partial<MemberSettingsInput>) {
    const merged: MemberSettingsInput = {
      theme: mode,
      reduceMotion,
      textSize,
      ...notifications,
      ...next,
    };

    void saveMemberSettings(merged).then((result) => {
      if (result.ok) return;
      toast({
        title: "Choice not saved",
        description: result.message,
        tone: "danger",
      });
    });
  }

  function setNotification(key: NotificationSettingKey, value: boolean) {
    setNotifications((current) => ({ ...current, [key]: value }));
    persist({ [key]: value });
  }

  function renderSection(id: SettingsSectionId) {
    if (id === "appearance") {
      return (
        <div className="space-y-6">
          {APPEARANCE_SETTINGS.map((setting) => {
            if (setting.key === "theme") {
              return (
                <div key={setting.key}>
                  <p className="text-sm font-medium text-ink">{setting.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                    {setting.description}
                  </p>
                  <SegmentedControl
                    label={setting.label}
                    value={mode}
                    onChange={(value) => {
                      const next = value as "system" | "light" | "dark";
                      setMode(next);
                      persist({ theme: next });
                    }}
                    className="mt-2 max-w-sm"
                    options={setting.options ?? []}
                  />
                </div>
              );
            }

            if (setting.key === "reduceMotion") {
              return (
                <Switch
                  key={setting.key}
                  label={setting.label}
                  description={setting.description}
                  checked={reduceMotion}
                  onCheckedChange={(value) => {
                    setReduceMotion(value);
                    persist({ reduceMotion: value });
                  }}
                />
              );
            }

            return (
              <div key={setting.key}>
                <p className="text-sm font-medium text-ink">{setting.label}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {setting.description}
                </p>
                <SegmentedControl
                  label={setting.label}
                  value={textSize}
                  onChange={(value) => {
                    const next = value === "large" ? "large" : "default";
                    setTextSize(next);
                    persist({ textSize: next });
                  }}
                  className="mt-2 max-w-sm"
                  options={setting.options ?? []}
                />
              </div>
            );
          })}

          <p className="text-xs leading-relaxed text-ink-soft">
            {initialSettings.available
              ? "These choices save to your account and follow you to another device."
              : "These choices are saved on this device until the member database is ready."}
          </p>
        </div>
      );
    }

    if (id === "notifications") {
      if (!initialSettings.available) {
        return (
          <p className="text-sm leading-relaxed text-ink-soft">
            Notification preferences will appear once the member database is
            ready. Your bell is still collecting notices in the meantime.
          </p>
        );
      }

      return (
        <div className="space-y-6">
          {NOTIFICATION_SETTINGS.map((setting) => (
            <Switch
              key={setting.key}
              label={setting.label}
              description={setting.description}
              checked={notifications[setting.key]}
              onCheckedChange={(value) => setNotification(setting.key, value)}
            />
          ))}
          <p className="text-xs leading-relaxed text-ink-soft">
            Turning a notice off only changes your bell. The content itself
            stays in the circle.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        {email ? (
          <div className="rounded-soft bg-surface-soft/55 px-4 py-3">
            <p className="text-sm font-medium text-ink">Email</p>
            <p className="mt-1 break-all text-sm text-ink">{email}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-soft">
              Only you and the circle admins can see this. Other members never
              do.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/profile"
            className="inline-flex min-h-9 items-center rounded-soft bg-sage-soft px-3 text-xs font-medium text-ink transition hover:bg-sage/35"
          >
            Edit your profile
          </Link>
          <MemberPasswordForm />
          <SignOutEverywhere />
        </div>

        <div className="border-t border-line pt-5">
          <p className="text-sm font-medium text-ink">Your data</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            Download a zip with your profile, reflections, prayers, saved
            affirmations, settings, and messages to admins.
          </p>
          <div className="mt-3">
            <ExportButton />
          </div>
        </div>

        <div className="border-t border-line pt-5">
          <p className="text-sm font-medium text-ink">Leaving the circle</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            You can keep your reflections without your name, or erase them. You
            will verify your email before anything is deleted.
          </p>
          <Link
            href="/settings/delete-account"
            className="mt-3 inline-flex min-h-9 items-center rounded-soft bg-danger-soft px-3 text-xs font-medium text-danger transition hover:bg-danger/10"
          >
            Delete your account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {SETTINGS_SECTIONS.map((section) => (
        <SettingsSection
          key={section.id}
          id={section.id}
          title={section.title}
          description={section.description}
        >
          {renderSection(section.id)}
        </SettingsSection>
      ))}
    </div>
  );
}
