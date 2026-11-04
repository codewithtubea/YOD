import { z } from "zod";

import { parseIsoDate } from "@/lib/date";

export const isoDateSchema = z
  .string()
  .trim()
  .refine((value) => parseIsoDate(value) !== null, "Choose a real date.");

export const postBodySchema = z
  .string()
  .trim()
  .min(1, "Write a thought or question first.")
  .max(1000, "Keep this under 1,000 characters.");

export const createPostSchema = z.object({
  planDate: isoDateSchema,
  kind: z.enum(["thought", "question"]),
  body: postBodySchema,
});

export const createReplySchema = z.object({
  postId: z.uuid("That post could not be found."),
  parentReplyId: z.uuid().nullable().optional(),
  body: postBodySchema,
});

export const editBodySchema = z.object({
  id: z.uuid(),
  body: postBodySchema,
});

export const amenSchema = z.object({
  targetType: z.enum(["post", "reply"]),
  targetId: z.uuid(),
  active: z.boolean(),
});

export const readReceiptSchema = z.object({
  planDate: isoDateSchema,
  read: z.boolean(),
});

export const hideContentSchema = z.object({
  id: z.uuid(),
  reason: z
    .string()
    .trim()
    .min(1, "Give a short reason for hiding this.")
    .max(300, "Keep the reason under 300 characters."),
});

export const markAnsweredSchema = z.object({
  postId: z.uuid(),
  replyId: z.uuid().nullable().optional(),
});

export const notificationIdSchema = z.uuid();

export const singlePlanSchema = z
  .object({
    date: isoDateSchema,
    book: z.string().trim().min(1, "Choose a Bible book.").max(40),
    chapterStart: z.coerce
      .number()
      .int("Choose a whole starting chapter.")
      .min(1, "Choose a valid starting chapter.")
      .max(200),
    chapterEnd: z.preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce
        .number()
        .int("Choose a whole ending chapter.")
        .min(1)
        .max(200)
        .optional(),
    ),
  })
  .refine(
    (value) =>
      value.chapterEnd === undefined || value.chapterEnd >= value.chapterStart,
    {
      message: "The ending chapter must be on or after the starting chapter.",
      path: ["chapterEnd"],
    },
  );

export const bulkPlanSchema = z.object({
  lines: z.string().trim().min(1, "Paste at least one reading.").max(60000),
  overwrite: z.boolean().optional().default(false),
});

export const generatePlanSchema = z.object({
  book: z.string().trim().min(1, "Choose a Bible book.").max(40),
  startChapter: z.coerce.number().int().min(1).max(200),
  days: z.coerce.number().int().min(1).max(365),
  startDate: isoDateSchema,
  overwrite: z.boolean().optional().default(false),
});

export const bibleSourceSchema = z.object({
  source: z.enum(["biblegateway", "youversion"]),
});
