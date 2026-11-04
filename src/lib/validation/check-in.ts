import { z } from "zod";

export const CHECK_IN_MOODS = [
  "grateful",
  "steady",
  "heavy",
  "resting",
] as const;

export type CheckInMood = (typeof CHECK_IN_MOODS)[number];

export const checkInMoodSchema = z.enum(
  CHECK_IN_MOODS,
  "Choose how this week feels.",
);

export const checkInNoteSchema = z
  .string()
  .trim()
  .max(280, "Keep your note under 280 characters.")
  .optional()
  .transform((value) => value || null);

export const saveCheckInSchema = z.object({
  mood: checkInMoodSchema,
  note: checkInNoteSchema,
});

export const sendEncouragementSchema = z.object({
  toUserId: z.uuid("Choose someone to encourage."),
  body: z
    .string()
    .trim()
    .min(1, "Write a short word of encouragement.")
    .max(280, "Keep this under 280 characters."),
});

export type SaveCheckInInput = z.infer<typeof saveCheckInSchema>;
export type SendEncouragementInput = z.infer<typeof sendEncouragementSchema>;
