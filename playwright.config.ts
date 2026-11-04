import { defineConfig, devices } from "@playwright/test";

import { assertStaging } from "./scripts/assert-staging.mjs";

const staging = assertStaging({ requireKey: true });

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const baseHost = new URL(baseURL).hostname;
if (!["127.0.0.1", "localhost"].includes(baseHost)) {
  throw new Error(
    "Refusing remote Playwright runs: start the app locally against staging.",
  );
}
const channel = process.env.PLAYWRIGHT_CHANNEL as "chrome" | undefined;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "pnpm dev",
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(
          (entry): entry is [string, string] => entry[1] !== undefined,
        ),
      ),
      NEXT_PUBLIC_SUPABASE_URL: staging.url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: staging.publishableKey,
    },
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(channel ? { channel } : {}),
      },
    },
  ],
});
