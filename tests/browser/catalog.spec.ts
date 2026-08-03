import { expect, test } from "@playwright/test";

const NAPOLEON_URL = /\/\?artwork=napoleon-dynamite$/;
const POND_URL = /\/\?artwork=pond$/;
const PLAY_URL = /\/play\/[^/]+$/;
const PIXEL_COUNT = /^\d+$/;
const ROOT_URL = /\/$/;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("artwork catalog", () => {
  test("shows a default preview and keeps the selected artwork in the URL", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Artworks" })).toBeVisible();
    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    await expect(preview).toBeVisible();
    await expect(preview.getByRole("heading", { name: "Napoleon Dynamite" })).toBeVisible();

    await page.locator('a[href="/?artwork=pond"]').click();
    await expect(page).toHaveURL(POND_URL);
    await expect(preview.getByRole("heading", { name: "Pond" })).toBeVisible();

    await preview.getByRole("button", { name: "See full artwork" }).click();
    await expect(preview.getByRole("button", { name: "Hide full artwork" })).toBeVisible();

    await page.locator('a[href="/?artwork=napoleon-dynamite"]').click();
    await expect(page).toHaveURL(NAPOLEON_URL);
    await expect(preview.getByRole("heading", { name: "Napoleon Dynamite" })).toBeVisible();
    await expect(preview.getByRole("button", { name: "See full artwork" })).toBeVisible();
  });

  test("opens every catalog entry and initializes its board", async ({ page }) => {
    await page.goto("/");

    const artworkLinks = page.locator('a[href*="artwork="]');
    await expect(artworkLinks.first()).toBeVisible();
    const artworkHrefs = await artworkLinks.evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")).filter((href): href is string => href !== null)
    );
    expect(artworkHrefs.length).toBeGreaterThan(0);

    await Promise.all(
      artworkHrefs.map(async (artworkHref) => {
        const artworkPage = await page.context().newPage();
        try {
          await artworkPage.goto(artworkHref);
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
