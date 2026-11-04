import { expect, test } from "@playwright/test";

const email = process.env.PLAYWRIGHT_MEMBER_EMAIL;
const password = process.env.PLAYWRIGHT_MEMBER_PASSWORD;

test.skip(
  !email || !password,
  "Set PLAYWRIGHT_MEMBER_EMAIL and PLAYWRIGHT_MEMBER_PASSWORD to run this flow.",
);

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in?next=/check-in");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/check-in"));
}

test("member can save a weekly check-in and sees aggregate presence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await signIn(page);

  await expect(
    page.getByRole("heading", { level: 1, name: "A gentle pulse." }),
  ).toBeVisible();
  await expect(page.getByText("The circle this week")).toBeVisible();

  await page.getByRole("button", { name: /Steady/ }).click();
  await page
    .getByLabel(/Anything you want the admins to know/)
    .fill("Held, even if the week has been ordinary.");
  await page.getByRole("button", { name: "Save my check-in" }).click();

  await expect(page.getByText("Saved this week")).toBeVisible();
  await expect(page.getByText("Only the total is shown")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  expect(errors).toEqual([]);
});

test("check-in privacy copy names the admin path", async ({ page }) => {
  await signIn(page);

  await expect(
    page.getByText("Admins can read check-ins and notes so they can care"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Privacy" }),
  ).toHaveAttribute("href", "/privacy");
});
