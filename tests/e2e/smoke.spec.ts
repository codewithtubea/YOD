import { expect, test } from "@playwright/test";

test("landing page explains the circle and links in", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Small enough to be known." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Ask to join the circle" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
});

test("join page asks for email, name, and password", async ({ page }) => {
  await page.goto("/join?email=friend%40example.com");

  await expect(
    page.getByRole("heading", { name: "Ask to join the circle." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveValue(
    "friend@example.com",
  );
  await expect(page.getByLabel("Your name")).toBeVisible();
  await expect(page.getByLabel("Choose a password")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Request to join" }),
  ).toBeVisible();
});

test("sign-in page renders", async ({ page }) => {
  await page.goto("/sign-in");

  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
});

test("an explicit dark theme uses the dark canvas token", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("yod:theme", "dark");
  });

  await page.goto("/sign-in");

  await expect
    .poll(() =>
      page.evaluate(() => getComputedStyle(document.body).backgroundColor),
    )
    .toBe("rgb(16, 21, 15)");
});
