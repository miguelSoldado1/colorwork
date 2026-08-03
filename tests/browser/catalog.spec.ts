import { expect, test } from "@playwright/test";

const PLAY_URL = /\/play\/[^/]+$/;
const PIXEL_COUNT = /^\d+$/;
const ROOT_URL = /\/$/;
const POND_BUTTON = /^Pond/;
const NAPOLEON_BUTTON = /^Napoleon Dynamite/;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("artwork catalog", () => {
  test("shows a default preview and keeps selection client-side", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Artworks" })).toBeVisible();
    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    await expect(preview).toBeVisible();
    await expect(preview.getByRole("heading", { name: "Napoleon Dynamite" })).toBeVisible();

    await page.getByRole("button", { name: POND_BUTTON }).click();
    await expect(page).toHaveURL(ROOT_URL);
    await expect(preview.getByRole("heading", { name: "Pond" })).toBeVisible();

    await preview.getByRole("button", { name: "See full artwork" }).click();
    await expect(preview.getByRole("button", { name: "Hide full artwork" })).toBeVisible();

    await page.getByRole("button", { name: NAPOLEON_BUTTON }).click();
    await expect(page).toHaveURL(ROOT_URL);
    await expect(preview.getByRole("heading", { name: "Napoleon Dynamite" })).toBeVisible();
    await expect(preview.getByRole("button", { name: "See full artwork" })).toBeVisible();
  });

  test("keeps the tapped row in place when selecting an artwork", async ({ page }) => {
    await page.setViewportSize({ height: 952, width: 539 });
    await page.goto("/");

    await page.getByRole("button", { name: POND_BUTTON }).click();
    await expect(page).toHaveURL(ROOT_URL);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.getByRole("heading", { name: "Pond" })).toBeVisible();
  });

  test("opens every catalog entry and initializes its board", async ({ page }) => {
    await page.goto("/");

    const artworkButtons = page.locator("ul button");
    await expect(artworkButtons.first()).toBeVisible();
    const artworkCount = await artworkButtons.count();
    expect(artworkCount).toBeGreaterThan(0);

    await Promise.all(
      Array.from({ length: artworkCount }, async (_, index) => {
        const artworkPage = await page.context().newPage();
        try {
          await artworkPage.goto("/");
          await artworkPage.locator("ul button").nth(index).click();
          const preview = artworkPage.getByRole("complementary", { name: "Artwork preview" });
          await expect(preview).toBeVisible();

          await preview.locator('a[href^="/play/"]').click();
          await expect(artworkPage).toHaveURL(PLAY_URL);
          const board = artworkPage.getByRole("img", {
            name: "Color-by-number puzzle. Choose a tool and interact with cells on the board.",
          });
          await expect(board).toBeVisible();
          await expect(board).toHaveAttribute("data-logical-pixels", PIXEL_COUNT);
        } finally {
          await artworkPage.close();
        }
      })
    );
  });

  test("redirects an unknown board to the catalog", async ({ page }) => {
    await page.goto("/play/not-a-real-artwork");

    await expect(page).toHaveURL(ROOT_URL);
    await expect(page.getByRole("heading", { name: "Artworks" })).toBeVisible();
  });
});
