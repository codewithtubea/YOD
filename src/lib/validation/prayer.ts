import { z } from "zod";

export const prayerBodySchema = z
  .string()
  .trim()
  .min(1, "Write a prayer first.")
  .max(1200, "Keep this under 1,200 characters.");

export const prayerUpdateBodySchema = z
  .string()
  .trim()
  .min(1, "Write an update first.")
  .max(600, "Keep updates under 600 characters.");

export const prayerIdSchema = z.uuid("That prayer could not be found.");

export const createPrayerSchema = z.object({
  body: prayerBodySchema,
});

export const addPrayerUpdateSchema = z.object({
  prayerId: prayerIdSchema,
  body: prayerUpdateBodySchema,
});

export const prayerActionSchema = z.object({
  prayerId: prayerIdSchema,
});
