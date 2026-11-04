import { expect, test } from "@playwright/test";

const email = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const password = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

test.skip(!email || !password, "Set admin e2e credentials to run this flow.");

const pages = [
  { path: "/admin", heading: "The circle, held with care." },
  { path: "/admin/members", heading: "The people in the circle." },
  { path: "/admin/invites", heading: "Open the door, personally." },
  { path: "/admin/reading", heading: "One chapter, held open." },
  { path: "/admin/affirmations", heading: "A word for each day." },
  { path: "/admin/moderation", heading: "Care, not surveillance." },
  { path: "/admin/questions", heading: "Questions, held with care." },
  { path: "/admin/announcements", heading: "One notice at a time." },
  { path: "/admin/sermons", heading: "A small shelf for listening." },
  { path: "/admin/settings", heading: "The shape of the circle." },
  { path: "/admin/audit", heading: "A record of care." },
  { path: "/affirmation", heading: "A word to carry." },
  { path: "/affirmation/archive", heading: "Words that stayed." },
  { path: "/affirmation/saved", heading: "Words you kept." },
];

test("admin can open every console page", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/sign-in?next=/admin");
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/admin"));
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  for (const item of pages) {
    const response = await page.goto(item.path);
    expect(response?.status(), item.path).toBeLessThan(500);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (item.heading) {
      await expect(
        page.getByRole("heading", { level: 1, name: item.heading }),
      ).toBeVisible();
    }
  }

  expect(errors).toEqual([]);
});

