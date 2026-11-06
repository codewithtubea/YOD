import { z } from "zod";

export const emailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.email("Enter a valid email address."),
);

export const passwordSchema = z
  .string()
  .min(1, "Enter your password.")
  .max(1024, "That password is too long.");

export const joinPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(1024, "That password is too long.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Add your name.")
  .max(80, "Keep your name under 80 characters.");

export const birthdaySchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || String(value).trim() === "") {
      return null;
    }
    return String(value).trim();
  },
  z.union([
    z.null(),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid birthday date.")
      .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()), {
        message: "Use a valid birthday date.",
      })
      .refine((value) => {
        const date = new Date(`${value}T00:00:00Z`);
        const today = new Date();
        const todayUtc = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate(),
          ),
        );
        return date <= todayUtc;
      }, "Birthday can't be in the future."),
  ]),
);
