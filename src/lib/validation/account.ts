import { z } from "zod";

import { joinPasswordSchema, passwordSchema } from "@/lib/validation/auth";

export const profileNameSchema = z
  .string()
  .trim()
  .min(1, "Add your name.")
  .max(50, "Keep your name under 50 characters.");

export const profileBioSchema = z
  .string()
  .trim()
  .max(160, "Keep your bio under 160 characters.")
  .optional()
  .transform((value) => value || null);

export const avatarPathSchema = z
  .string()
  .trim()
  .max(300, "That image path is too long.")
  .regex(
    /^[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/,
    "Choose an image from your own avatar folder.",
  );

export const profileSchema = z.object({
  displayName: profileNameSchema,
  bio: profileBioSchema,
});

export const memberSettingsSchema = z.object({
  reduceMotion: z.boolean(),
  theme: z.enum(["system", "light", "dark"]),
  textSize: z.enum(["default", "large"]),
  notifyReplies: z.boolean().optional(),
  notifyAmens: z.boolean().optional(),
  notifyAnswered: z.boolean().optional(),
  notifyEncouragements: z.boolean().optional(),
});

export const accountPasswordSchema = z
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

export const contactCategorySchema = z.enum([
  "account",
  "privacy",
  "content",
  "technical",
  "other",
]);

export const contactMessageSchema = z.object({
  category: contactCategorySchema,
  subject: z
    .string()
    .trim()
    .min(1, "Add a short subject.")
    .max(120, "Keep the subject under 120 characters."),
  body: z
    .string()
    .trim()
    .min(1, "Write your message.")
    .max(2000, "Keep your message under 2,000 characters."),
});

export const accountActionChallengeSchema = z.uuid(
  "Request a new verification code.",
);

export const verificationCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code from the email.");

export const deleteAccountSchema = z.object({
  proofId: z.uuid("Verify your email again before deleting your account."),
  keepContributions: z.boolean(),
  confirmation: z.literal("DELETE", {
    message: "Type DELETE to confirm.",
  }),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type MemberSettingsInput = z.infer<typeof memberSettingsSchema>;
export type ContactMessageInput = z.infer<typeof contactMessageSchema>;
