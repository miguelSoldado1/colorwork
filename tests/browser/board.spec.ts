import { Buffer } from "node:buffer";
import { expect, type Page, test } from "@playwright/test";

const BOARD_LABEL = "Color-by-number puzzle. Choose a tool and interact with cells on the board.";
const IMPORTED_URL = /\/play\/two-color-fixture-/;
const PAINTED_ANY = /[1-9][0-9,]* of [0-9,]+ pixels painted/;
const ZOOMED_IN = /^1\.8/;
const FIXTURE = {
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFklEQVR4nGOIrvn1H4Q/Ho8GYwbSBQAv3i8R9w9IPAAAAABJRU5ErkJggg==",
    "base64"
  ),
  mimeType: "image/png",
  name: "two-color-fixture.png",
};

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("coloring board", () => {
  test("imports a tiny puzzle and completes it with pencil, picker, and bucket tools", async ({ page }) => {
    await openImportedPuzzle(page);

    await paintCell(page, 0, 0);
    await expect(page.getByRole("status", { name: "1 of 16 pixels painted" })).toBeVisible();

    // A wrong selected color is ignored rather than corrupting the board.
    await paintCell(page, 3, 0);
    await expect(page.getByRole("status", { name: "1 of 16 pixels painted" })).toBeVisible();

    await page.getByRole("button", { name: "Color 2: 0 of 8 cells painted" }).click();
    await page.getByRole("button", { name: "Bucket fill tool" }).click();
    await paintCell(page, 3, 0);
    await expect(page.getByRole("status", { name: "9 of 16 pixels painted" })).toBeVisible();

    await page.getByRole("button", { name: "Color picker tool" }).click();
    await paintCell(page, 0, 1);
    await expect(page.getByRole("button", { name: "Color 1: 1 of 8 cells painted" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await page.getByRole("button", { name: "Bucket fill tool" }).click();
    await paintCell(page, 0, 1);
    await expect(page.getByRole("status", { name: "16 of 16 pixels painted" })).toBeVisible();
    await expect(
      page.locator('[role="status"]').filter({ hasText: "Puzzle complete. Every pixel is painted." })
    ).toBeAttached();
  });

  test("toggles board display preferences and tool pressed states", async ({ page }) => {
    await openImportedPuzzle(page);

    const gridButton = page.getByRole("button", { name: "Hide grid" });
    await expect(gridButton).toHaveAttribute("aria-pressed", "true");
    await gridButton.click();
    await expect(page.getByRole("button", { name: "Show grid" })).toHaveAttribute("aria-pressed", "false");

    const numbersButton = page.getByRole("button", { name: "Show color numbers" });
    await expect(numbersButton).toHaveAttribute("aria-pressed", "false");
    await numbersButton.click();
    await expect(page.getByRole("button", { name: "Hide color numbers" })).toHaveAttribute("aria-pressed", "true");

    const zoomButton = page.getByRole("button", { name: "Zoom in tool" });
    await zoomButton.click();
    await expect(zoomButton).toHaveAttribute("aria-pressed", "true");
    await paintCell(page, 2, 2);
    await expect(page.getByRole("img", { name: BOARD_LABEL })).toHaveAttribute("data-zoom", ZOOMED_IN);
  });

  test("persists catalog progress and clears it from the menu", async ({ page }) => {
    await page.goto("/play/pond");
    const canvas = page.getByRole("img", { name: BOARD_LABEL });
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error("The board canvas did not receive a layout box.");
    }

    const position = { x: box.width / 2, y: box.height / 2 };
    await canvas.click({ button: "middle", position });
    await canvas.click({ position });
    await expect(page.getByRole("status", { name: PAINTED_ANY })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => key === "color-byte:progress:v1:pond")))
      .toBe(true);

    await page.getByRole("link", { name: "All artworks" }).click();
    await page.locator('a[href="/?artwork=pond"]').click();

    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    const startOver = preview.getByRole("button", { name: "Start over" });
    await expect(startOver).toBeEnabled();

    await startOver.click();
    await expect(preview.getByRole("button", { name: "Yes, clear it" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(preview.getByRole("button", { name: "Start over" })).toBeEnabled();

    await preview.getByRole("button", { name: "Start over" }).click();
    await preview.getByRole("button", { name: "Yes, clear it" }).click();
    await expect(preview.getByRole("button", { name: "Start over" })).toBeDisabled();
    await expect(page.locator('a[href="/?artwork=pond"]')).toContainText("0 | 65,536");
  });
});

async function openImportedPuzzle(page: Page) {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Use this puzzle" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Use this puzzle" }).click();

  await expect(page).toHaveURL(IMPORTED_URL);
  await expect(page.getByRole("heading", { name: "Two Color Fixture" })).toBeVisible();
  await expect(page.getByRole("img", { name: BOARD_LABEL })).toBeVisible();
  await expect(page.getByRole("status", { name: "0 of 16 pixels painted" })).toBeVisible();
}

async function paintCell(page: Page, x: number, y: number) {
  const canvas = page.getByRole("img", { name: BOARD_LABEL });
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("The board canvas did not receive a layout box.");
  }

  await page.mouse.click(box.x + ((x + 0.5) / 4) * box.width, box.y + ((y + 0.5) / 4) * box.height);
}
