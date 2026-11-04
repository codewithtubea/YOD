import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SignInForm } from "@/app/(auth)/sign-in/sign-in-form";
import { signIn } from "@/app/(auth)/sign-in/actions";

vi.mock("@/app/(auth)/sign-in/actions", () => ({
  signIn: vi.fn(),
}));

const signInMock = vi.mocked(signIn);

const testPassword = crypto.randomUUID();

function fillForm() {
  fireEvent.change(screen.getByLabelText("Email address"), {
    target: { value: "member@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: testPassword },
  });
}

describe("SignInForm", () => {
  beforeEach(() => {
    signInMock.mockReset();
  });

  it("submits the email and password", async () => {
    signInMock.mockResolvedValue({ ok: true, message: "" });

    render(
      <SignInForm next="/today" initialError={null} initialNotice={null} />,
    );

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledWith({
        email: "member@example.com",
        password: testPassword,
        next: "/today",
      });
    });
  });

  it("shows a returned error and stays on the form", async () => {
    signInMock.mockResolvedValue({
      ok: false,
      message: "Email or password is incorrect.",
    });

    render(
      <SignInForm next="/today" initialError={null} initialNotice={null} />,
    );

    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain(
        "Email or password is incorrect.",
      );
    });

    expect(screen.getByLabelText("Email address")).toBeTruthy();
    expect(screen.queryByText(/sign-in link/i)).toBeNull();
  });

  it("toggles password visibility", () => {
    render(
      <SignInForm next="/today" initialError={null} initialNotice={null} />,
    );

    const password = screen.getByLabelText("Password") as HTMLInputElement;
    expect(password.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(password.type).toBe("text");
  });
});
