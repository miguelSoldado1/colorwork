import { expect, test } from "@playwright/test";

const PRIVACY_URL = /\/privacy$/;
const ROOT_URL = /\/$/;

test.use({ storageState: { cookies: [], origins: [] } });

test("opens the privacy notice from the artwork menu", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy" }).click();

  await expect(page).toHaveURL(PRIVACY_URL);
  await expect(page).toHaveTitle("Privacy - Colorwork");
  await expect(page.getByRole("heading", { name: "Your work stays in your browser." })).toBeVisible();
  await expect(page.getByText("Colorwork uses IndexedDB")).toBeVisible();
  await expect(page.getByText("Colorwork uses Vercel Web Analytics")).toBeVisible();
  await expect(page.getByText("Colorwork uses PostHog")).toBeVisible();

  await page.getByRole("link", { name: "All artworks" }).click();
  await expect(page).toHaveURL(ROOT_URL);
});
