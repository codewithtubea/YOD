import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/forgot-password-form";
import { requestPasswordReset } from "@/app/(auth)/forgot-password/actions";
import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/site-url";
import { resetPasswordSchema } from "@/lib/validation/auth";

vi.mock("@/app/(auth)/forgot-password/actions", () => ({
  requestPasswordReset: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

const requestMock = vi.mocked(requestPasswordReset);
const headersMock = vi.mocked(headers);

function mockHost(host: string) {
  headersMock.mockResolvedValue({
    get: (name: string) => {
      if (name === "x-forwarded-host") return host;
      if (name === "x-forwarded-proto") return "https";
      return null;
    },
  } as Awaited<ReturnType<typeof headers>>);
}

describe("password recovery", () => {
  beforeEach(() => {
    requestMock.mockReset();
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("submits the email and shows the generic confirmation", async () => {
    requestMock.mockResolvedValue({
      ok: true,
      message: "If that email has an account, a reset link is on its way.",
    });

    render(<ForgotPasswordForm initialEmail="" />);
    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: "member@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({ email: "member@example.com" });
    });
    expect(screen.getByRole("status").textContent).toContain("reset link");
  });

  it("requires matching new passwords", () => {
    const result = resetPasswordSchema.safeParse({
      token: "token",
      password: "new-password-123",
      confirmPassword: "different-password",
    });

    expect(result.success).toBe(false);
  });

  it("refuses to build links from a Vercel preview host", async () => {
    mockHost("yod-circle-git-main.vercel.app");

    await expect(getSiteUrl()).resolves.toEqual({
      ok: false,
      reason: "preview-host",
    });
  });

  it("uses the configured site URL over request headers", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://yod.example.com/";
    mockHost("yod-circle-git-main.vercel.app");

    await expect(getSiteUrl()).resolves.toEqual({
      ok: true,
      url: "https://yod.example.com",
    });
  });
});
