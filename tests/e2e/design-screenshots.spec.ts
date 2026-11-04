import { expect, test } from "@playwright/test";

const adminState = process.env.PLAYWRIGHT_ADMIN_STATE;

const viewports = [
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
];

for (const viewport of viewports) {
  for (const theme of ["light", "dark"] as const) {
    for (const reduceMotion of [false, true]) {
      const motion = reduceMotion ? "reduced" : "motion";
      const name = `design-${theme}-${motion}-${viewport.width}x${viewport.height}`;

      test(name, async ({ browser }) => {
        test.skip(
          !adminState,
          "Set PLAYWRIGHT_ADMIN_STATE to an authenticated admin storage-state file.",
        );

        const context = await browser.newContext({
          viewport,
          storageState: adminState,
          colorScheme: theme,
          reducedMotion: reduceMotion ? "reduce" : "no-preference",
        });
        const page = await context.newPage();

        await page.addInitScript(
          ({ theme: selectedTheme, reduceMotion: selectedReduceMotion }) => {
            window.localStorage.setItem("yod:theme", selectedTheme);
            window.localStorage.setItem(
              "yod:reduce-motion",
              String(selectedReduceMotion),
            );
          },
          { theme, reduceMotion },
        );

        await page.goto("/design");
        await expect(
          page.getByRole("heading", { name: "A quiet visual language." }),
        ).toBeVisible();

        await page.screenshot({
          path: `tests/e2e/__screenshots__/${name}.png`,
          fullPage: true,
          animations: "disabled",
        });

        await context.close();
      });
    }
  }
}
