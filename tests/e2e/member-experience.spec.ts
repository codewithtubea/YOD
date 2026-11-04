import { expect, test } from "@playwright/test";

const email = process.env.PLAYWRIGHT_MEMBER_EMAIL;
const password = process.env.PLAYWRIGHT_MEMBER_PASSWORD;

test.skip(
  !email || !password,
  "Set PLAYWRIGHT_MEMBER_EMAIL and PLAYWRIGHT_MEMBER_PASSWORD to run this flow.",
);

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in?next=/settings");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/settings"));
}

test("member can reach settings, profile, privacy, and help", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await signIn(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "Make it yours" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Account" })).toBeVisible();

  await page.goto("/profile");
  await expect(
    page.getByRole("heading", { level: 1, name: "Your profile" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit profile" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { level: 1, name: "Care, not surveillance." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Anonymous prayer authorship" }),
  ).toBeVisible();

  await page.goto("/help");
  await expect(
    page.getByRole("heading", { level: 1, name: "A quiet guide." }),
  ).toBeVisible();

  expect(errors).toEqual([]);
});

test("member pages do not overflow a phone viewport", async ({ page }) => {
  await signIn(page);

  for (const path of ["/settings", "/profile", "/privacy", "/help"]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(1);
  }
});
