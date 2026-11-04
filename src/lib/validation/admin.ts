import { z } from "zod";

import { isValidTimeZone } from "@/lib/date";
import { emailSchema, joinPasswordSchema, passwordSchema } from "@/lib/validation/auth";

export function parseInviteEmails(input: string): {
  emails: string[];
  invalid: string[];
  duplicates: string[];
} {
  const raw = input
    .split(/[\s,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const seen = new Set<string>();
  const emails: string[] = [];
  const invalid: string[] = [];
  const duplicates: string[] = [];

  for (const value of raw) {
    if (seen.has(value)) {
      duplicates.push(value);
      continue;
    }
    seen.add(value);

    if (emailSchema.safeParse(value).success) emails.push(value);
    else invalid.push(value);
  }

  return { emails, invalid, duplicates };
}

export const inviteFormSchema = z.object({
  emails: z
    .string()
    .trim()
    .min(1, "Add at least one email address.")
    .max(6000, "Add fewer email addresses at a time."),
  role: z.enum(["member", "admin"]),
  personalNote: z
    .string()
    .trim()
    .max(600, "Keep the note under 600 characters.")
    .optional()
    .transform((value) => value || null),
  expiryDays: z.coerce
    .number()
    .int("Choose whole days.")
    .min(1, "Use at least 1 day.")
    .max(90, "Use 90 days or fewer."),
});

export const memberRoleSchema = z.object({
  userId: z.uuid("Choose a member."),
  role: z.enum(["member", "admin"]),
});

export const memberStatusSchema = z.object({
  userId: z.uuid("Choose a member."),
  status: z.enum(["active", "deactivated"]),
});

export const memberApprovalSchema = z.object({
  userId: z.uuid("Choose a member."),
});

export const careNudgeSchema = z.object({
  userId: z.uuid("Choose a member."),
  postId: z.uuid("Choose a thought.").nullish(),
});

export const inviteIdSchema = z.uuid("Choose an invite.");

export const hideContentSchema = z.object({
  targetType: z.enum(["post", "reply"]),
  targetId: z.uuid("Choose a post or reply."),
  reason: z
    .string()
    .trim()
    .min(3, "Add a short reason.")
    .max(280, "Keep the reason under 280 characters."),
});

export const resolveReportSchema = z.object({
  reportId: z.uuid("Choose a report."),
  resolutionNote: z
    .string()
    .trim()
    .min(3, "Add a short resolution note.")
    .max(500, "Keep the note under 500 characters."),
});

export const resolveConcernSchema = z.object({
  concernId: z.uuid("Choose a concern."),
  note: z
    .string()
    .trim()
    .min(3, "Add a short resolution note.")
    .max(500, "Keep the note under 500 characters."),
});

export const reportContentSchema = z.object({
  targetType: z.enum(["post", "reply"]),
  targetId: z.uuid("Choose a post or reply."),
  reason: z.enum(["unkind", "unsafe", "private", "other"]),
  note: z
    .string()
    .trim()
    .max(500, "Keep the note under 500 characters.")
    .optional()
    .transform((value) => value || null),
});

export const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Add a title.")
    .max(120, "Keep the title under 120 characters."),
  body: z
    .string()
    .trim()
    .min(1, "Add a short announcement.")
    .max(1000, "Keep the announcement under 1,000 characters."),
  endsAt: z
    .string()
    .trim()
    .optional()
    .transform((value) => value || null),
});

export const announcementIdSchema = z.uuid("Choose an announcement.");

export const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Add a circle name.")
    .max(80, "Keep the name under 80 characters."),
  timezone: z
    .string()
    .trim()
    .refine(isValidTimeZone, "Choose a valid time zone."),
  defaultBibleSource: z.enum(["biblegateway", "youversion"]),
  careInactivityDays: z.coerce
    .number()
    .int("Choose whole days.")
    .min(1, "Use at least 1 day.")
    .max(30, "Use 30 days or fewer."),
  inviteMessageTemplate: z
    .string()
    .trim()
    .max(2000, "Keep the template under 2,000 characters.")
    .optional()
    .transform((value) => value || null),
});

export const sermonSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Add a title.")
    .max(140, "Keep the title under 140 characters."),
  url: z
    .string()
    .trim()
    .min(8, "Add a link.")
    .max(2048, "That link is too long.")
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    }, "Use a full http or https link."),
  isPublished: z.boolean().default(true),
});

export const sermonIdSchema = z.uuid("Choose a sermon link.");

export const sermonPublishSchema = z.object({
  id: z.uuid("Choose a sermon link."),
  isPublished: z.boolean(),
});

export type InviteFormInput = z.infer<typeof inviteFormSchema>;
export type ReportContentInput = z.infer<typeof reportContentSchema>;

export const adminPasswordSchema = z
  .object({
    currentPassword: passwordSchema,
    newPassword: joinPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm the new password."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "The new passwords do not match.",
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one.",
  });
