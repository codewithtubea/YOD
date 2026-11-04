"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { AdminSection } from "@/components/admin/page";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { saveSettings } from "@/lib/admin/actions";
import { buildInviteMessage, DEFAULT_INVITE_TEMPLATE } from "@/lib/admin/invites";
import type { CircleSettings } from "@/lib/circle";

const inputClass =
  "block min-h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-focus focus:ring-2 focus:ring-focus/15";

export function SettingsForm({
  settings,
  timezones,
  today,
  siteUrl,
}: {
  settings: CircleSettings;
  timezones: string[];
  today: string;
  siteUrl: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(settings.name);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [source, setSource] = useState(settings.defaultBibleSource);
  const [careDays, setCareDays] = useState(String(settings.careInactivityDays));
  const [template, setTemplate] = useState(settings.inviteMessageTemplate ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = buildInviteMessage({
    circleName: name || "YOD Circle",
    inviteUrl: `${siteUrl}/join?email=friend%40example.com`,
    email: "friend@example.com",
    template: template || DEFAULT_INVITE_TEMPLATE,
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveSettings({
      name,
      timezone,
      defaultBibleSource: source,
      careInactivityDays: Number(careDays),
      inviteMessageTemplate: template,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    toast({ title: "Settings saved", description: "The circle will use these from now on." });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          <div>
            <label htmlFor="settings-name" className="text-sm font-medium text-ink">
              Circle name
            </label>
            <input
              id="settings-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
              className={`${inputClass} mt-2`}
            />
          </div>
          <div>
            <label htmlFor="settings-timezone" className="text-sm font-medium text-ink">
              Circle time zone
            </label>
            <select
              id="settings-timezone"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className={`${inputClass} mt-2`}
            >
              {timezones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll("_", " ")}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-soft">
              &ldquo;Today&rdquo; is computed here, on the server. Currently {today}.
            </p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label htmlFor="settings-source" className="text-sm font-medium text-ink">
              Default Bible link
            </label>
            <select
              id="settings-source"
              value={source}
              onChange={(event) =>
                setSource(event.target.value as CircleSettings["defaultBibleSource"])
              }
              className={`${inputClass} mt-2`}
            >
              <option value="biblegateway">BibleGateway</option>
              <option value="youversion">YouVersion</option>
            </select>
            <p className="mt-1 text-xs text-ink-soft">
              We only link out. No Bible translation text is stored or reproduced.
            </p>
          </div>
          <div>
            <label htmlFor="settings-care" className="text-sm font-medium text-ink">
              Care check-in after
            </label>
            <div className="mt-2 flex items-center gap-3">
              <input
                id="settings-care"
                type="number"
                min={1}
                max={30}
                value={careDays}
                onChange={(event) => setCareDays(event.target.value)}
                className={`${inputClass} max-w-24`}
              />
              <span className="text-sm text-ink-soft">days without a visit</span>
            </div>
          </div>
        </div>
      </div>

      <AdminSection
        title="Invite message"
        description="This is copied when you create an invite. No email is sent automatically."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <label htmlFor="settings-template" className="text-sm font-medium text-ink">
              Template
            </label>
            <textarea
              id="settings-template"
              value={template}
              onChange={(event) => setTemplate(event.target.value)}
              rows={10}
              maxLength={2000}
              placeholder={DEFAULT_INVITE_TEMPLATE}
              className={`${inputClass} mt-2 py-3 font-mono text-xs leading-relaxed`}
            />
            <p className="mt-2 text-xs leading-relaxed text-ink-soft">
              Placeholders: <code className="text-ink">{"{circle}"}</code>,{" "}
              <code className="text-ink">{"{link}"}</code>,{" "}
              <code className="text-ink">{"{email}"}</code>. Leave blank to use the
              default.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Preview</p>
            <pre className="mt-2 min-h-52 whitespace-pre-wrap break-words rounded-xl border border-line bg-surface-soft/50 p-4 font-sans text-sm leading-relaxed text-ink-soft">
              {preview}
            </pre>
          </div>
        </div>
      </AdminSection>

      {error ? (
        <p role="alert" className="border-l-2 border-danger/60 py-1 pl-4 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
        <Button type="submit" loading={saving}>
          <Save aria-hidden size={16} />
          Save settings
        </Button>
        <span className="text-xs text-ink-soft">
          Changes are recorded in the audit log.
        </span>
      </div>
    </form>
  );
}
