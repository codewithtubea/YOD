import { z } from "zod";

import { parseIsoDate } from "@/lib/date";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .nullish()
    .transform((value) => value || null);

export const affirmationBodySchema = z
  .string()
  .trim()
  .min(1, "Write today's affirmation.")
  .max(400, "Keep this under 400 characters.");

export const affirmationStatusSchema = z.enum([
  "draft",
  "scheduled",
  "archived",
]);

export const affirmationIdSchema = z.uuid("That affirmation could not be found.");

export const saveAffirmationSchema = z
  .object({
    id: z.uuid().optional(),
    body: affirmationBodySchema,
    scriptureRef: optionalText(60, "Keep the reference under 60 characters."),
    imagePath: optionalText(300, "That image path is too long."),
    imageAlt: optionalText(200, "Keep the image description under 200 characters."),
    status: affirmationStatusSchema,
    publishDate: z
      .string()
      .trim()
      .nullish()
      .transform((value) => value || null),
  })
  .superRefine((value, context) => {
    if (value.status !== "draft" && !value.publishDate) {
      context.addIssue({
        code: "custom",
        path: ["publishDate"],
        message: "Choose the day this affirmation should appear.",
      });
    }

    if (value.publishDate && !parseIsoDate(value.publishDate)) {
      context.addIssue({
        code: "custom",
        path: ["publishDate"],
        message: "Choose a real calendar date.",
      });
    }

    if (value.imagePath && !value.imageAlt) {
      context.addIssue({
        code: "custom",
        path: ["imageAlt"],
        message: "Describe the image for someone who cannot see it.",
      });
    }
  });

export const archiveAffirmationSchema = z.object({
  id: affirmationIdSchema,
});

export const affirmationActionSchema = z.object({
  affirmationId: affirmationIdSchema,
});

export type SaveAffirmationInput = z.infer<typeof saveAffirmationSchema>;
