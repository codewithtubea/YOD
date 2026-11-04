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
