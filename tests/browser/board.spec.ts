import { Buffer } from "node:buffer";
import { expect, type Page, test } from "@playwright/test";

const BOARD_LABEL = "Color-by-number puzzle. Choose a tool and interact with cells on the board.";
const IMPORTED_URL = /\/play\/two-color-fixture-/;
const PAINTED_ANY = /[1-9][0-9,]* of [0-9,]+ pixels painted/;
const RIBBIT_BUTTON = /^Ribbit/;
const ZOOMED_IN = /^1\.8/;
const ZOOMED_IN_TWICE = /^3\.24/;
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
    await expect(page.getByRole("group", { name: "1 of 16 pixels painted" })).toBeVisible();

    // A wrong selected color is ignored rather than corrupting the board.
    await paintCell(page, 3, 0);
    await expect(page.getByRole("group", { name: "1 of 16 pixels painted" })).toBeVisible();

    await page.getByRole("button", { name: "Color 2: 0 of 8 cells painted" }).click();
    await page.getByRole("button", { name: "Bucket fill tool" }).click();
    await paintCell(page, 3, 0);
    await expect(page.getByRole("group", { name: "9 of 16 pixels painted" })).toBeVisible();

    await page.getByRole("button", { name: "Color picker tool" }).click();
    await paintCell(page, 0, 1);
    await expect(page.getByRole("button", { name: "Color 1: 1 of 8 cells painted" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await page.getByRole("button", { name: "Bucket fill tool" }).click();
    await paintCell(page, 0, 1);
    await expect(page.getByRole("group", { name: "16 of 16 pixels painted" })).toBeVisible();
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

  test("supports keyboard painting on the focused board", async ({ page }) => {
    await openImportedPuzzle(page);

    const canvas = page.getByRole("img", { name: BOARD_LABEL });
    await expect(canvas).toHaveAttribute("tabindex", "0");
    await canvas.focus();
    await expect(canvas).toBeFocused();
    await page.keyboard.press("Space");

    await expect(page.getByRole("group", { name: "1 of 16 pixels painted" })).toBeVisible();
  });

  test("keeps the keyboard cursor visible across zoomed viewport edges", async ({ page }) => {
    await page.goto("/play/gobbo");

    const canvas = page.getByRole("img", { name: BOARD_LABEL });
    await expect(canvas).toBeVisible();
    await page.getByRole("button", { name: "Zoom in tool" }).click();
    await canvas.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Space");
    await expect(canvas).toHaveAttribute("data-zoom", ZOOMED_IN_TWICE);

    await page.getByRole("button", { name: "Pencil tool" }).click();
    await canvas.focus();

    await pressRepeatedly(page, "ArrowRight", 16);
    await expect.poll(() => hasKeyboardCursor(canvas)).toBe(true);
    await pressRepeatedly(page, "ArrowDown", 7);
    await expect.poll(() => hasKeyboardCursor(canvas)).toBe(true);
    await pressRepeatedly(page, "ArrowLeft", 16);
    await expect.poll(() => hasKeyboardCursor(canvas)).toBe(true);
    await pressRepeatedly(page, "ArrowUp", 7);
    await expect.poll(() => hasKeyboardCursor(canvas)).toBe(true);
  });

  test("persists catalog progress and clears it from the menu", async ({ page }) => {
    await page.goto("/play/ribbit");
    const canvas = page.getByRole("img", { name: BOARD_LABEL });
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error("The board canvas did not receive a layout box.");
    }

    const position = { x: box.width / 2, y: box.height / 2 };
    await canvas.click({ button: "middle", position });
    await canvas.click({ position });
    await expect(page.getByRole("group", { name: PAINTED_ANY })).toBeVisible();
    await expect.poll(() => hasStoredProgress(page, "ribbit")).toBe(true);

    await page.getByRole("link", { name: "All artworks" }).click();
    await page.getByRole("button", { name: RIBBIT_BUTTON }).click();

    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    const startOver = preview.getByRole("button", { name: "Start over" });
    await expect(startOver).toBeEnabled();

    await preview.getByRole("link", { name: "Keep painting" }).click();
    await expect(page.getByRole("group", { name: PAINTED_ANY })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("group", { name: PAINTED_ANY })).toBeVisible();

    await page.getByRole("link", { name: "All artworks" }).click();
    await page.getByRole("button", { name: RIBBIT_BUTTON }).click();
    const restoredPreview = page.getByRole("complementary", { name: "Artwork preview" });

    await restoredPreview.getByRole("button", { name: "Start over" }).click();
    await expect(restoredPreview.getByRole("button", { name: "Yes, clear it" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(restoredPreview.getByRole("button", { name: "Start over" })).toBeEnabled();

    await restoredPreview.getByRole("button", { name: "Start over" }).click();
    await restoredPreview.getByRole("button", { name: "Yes, clear it" }).click();
    await expect(restoredPreview.getByRole("button", { name: "Start over" })).toBeDisabled();
    await expect(page.getByRole("button", { name: RIBBIT_BUTTON })).toContainText("0 | 12,544");
  });

  test("refreshes menu progress when another tab saves", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: RIBBIT_BUTTON }).click();
    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    await expect(preview.getByRole("button", { name: "Start over" })).toBeDisabled();

    const boardPage = await page.context().newPage();
    try {
      await boardPage.goto("/play/ribbit");
      const canvas = boardPage.getByRole("img", { name: BOARD_LABEL });
      await expect(canvas).toBeVisible();
      const box = await canvas.boundingBox();
      if (!box) {
        throw new Error("The board canvas did not receive a layout box.");
      }

      const position = { x: box.width / 2, y: box.height / 2 };
      await canvas.click({ button: "middle", position });
      await canvas.click({ position });
      await expect(boardPage.getByRole("group", { name: PAINTED_ANY })).toBeVisible();
      await expect.poll(() => hasStoredProgress(boardPage, "ribbit")).toBe(true);

      await expect(preview.getByRole("button", { name: "Start over" })).toBeEnabled();
    } finally {
      await boardPage.close();
    }
  });
});

async function openImportedPuzzle(page: Page) {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Import this puzzle" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Import this puzzle" }).click();

  await expect(page).toHaveURL(IMPORTED_URL);
  await expect(page.getByRole("heading", { name: "Two Color Fixture" })).toBeVisible();
  await expect(page.getByRole("img", { name: BOARD_LABEL })).toBeVisible();
  await expect(page.getByRole("group", { name: "0 of 16 pixels painted" })).toBeVisible();
}

async function paintCell(page: Page, x: number, y: number) {
  const canvas = page.getByRole("img", { name: BOARD_LABEL });
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("The board canvas did not receive a layout box.");
  }

  await page.mouse.click(box.x + ((x + 0.5) / 4) * box.width, box.y + ((y + 0.5) / 4) * box.height);
}

async function pressRepeatedly(page: Page, key: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    // biome-ignore lint/performance/noAwaitInLoops: Keyboard input must preserve user-event order.
    await page.keyboard.press(key);
  }
}

function hasKeyboardCursor(canvas: ReturnType<Page["getByRole"]>) {
  return canvas.evaluate((element) => {
    const board = element as HTMLCanvasElement;
    const context = board.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Could not inspect the keyboard cursor.");
    }

    const reference = document.createElement("canvas");
    reference.width = 1;
    reference.height = 1;
    const referenceContext = reference.getContext("2d", { willReadFrequently: true });
    if (!referenceContext) {
      throw new Error("Could not prepare the keyboard cursor color.");
    }
    referenceContext.fillStyle = getComputedStyle(board).getPropertyValue("--color-primary");
    referenceContext.fillRect(0, 0, 1, 1);
    const [red, green, blue] = referenceContext.getImageData(0, 0, 1, 1).data;
    const pixels = context.getImageData(0, 0, board.width, board.height).data;

    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] === red && pixels[index + 1] === green && pixels[index + 2] === blue) {
        return true;
      }
    }
    return false;
  });
}

function hasStoredProgress(page: Page, artworkId: string) {
  return page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("colorwork");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    try {
      return await new Promise<boolean>((resolve, reject) => {
        const request = database.transaction("progress").objectStore("progress").get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result !== undefined);
      });
    } finally {
      database.close();
    }
  }, artworkId);
}
