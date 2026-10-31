import { expect, type Locator, type Page, test } from "@playwright/test";

const BOARD_LABEL = "Color-by-number puzzle. Choose a tool and interact with cells on the board.";
const COLOR_BUTTON = /^Color \d+:/;
const COMPLETE = "Puzzle complete. Every pixel is painted.";

for (const input of ["mouse", "touch"] as const) {
  test.describe(`${input} color advancement`, () => {
    test.use({ hasTouch: true });

    test("waits 250 ms and lets manual selections cancel the advance", async ({ page }) => {
      await openPuzzle(page);
      await page.getByRole("button", { name: "Bucket fill tool" }).click();
      const canvas = page.getByRole("img", { name: BOARD_LABEL });
      const palette = page.getByRole("button", { name: COLOR_BUTTON });
      await canvas.focus();
      await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
      await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));

      await page.keyboard.press("Space");
      await page.clock.runFor(249);
      await expect(palette.nth(0)).toHaveAttribute("aria-pressed", "true");
      await page.clock.runFor(1);
      await expect(palette.nth(1)).toHaveAttribute("aria-pressed", "true");

      // Click the same swatch during its pause: React must still deliver the selection.
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Space");
      await palette.nth(1).dispatchEvent("click");
      await page.clock.runFor(300);
      await expect(palette.nth(1)).toHaveAttribute("aria-pressed", "true");

      // A different manual selection also takes precedence over the scheduled next color.
      await page.keyboard.press("3");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Space");
      await page.keyboard.press("1");
      await page.clock.runFor(300);
      await expect(palette.nth(0)).toHaveAttribute("aria-pressed", "true");

      await page.keyboard.press("4");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Space");
      await page.clock.runFor(16);
      await expect(page.getByRole("status").filter({ hasText: COMPLETE })).toBeAttached();
      await expect(palette.nth(3)).toHaveAttribute("aria-pressed", "true");
    });

    test("advances after painting, skips completed colors, wraps, and preserves completion", async ({ page }) => {
      if (input === "touch") {
        await page.setViewportSize({ height: 844, width: 390 });
      }
      await openPuzzle(page);
      const canvas = page.getByRole("img", { name: BOARD_LABEL });
      const palette = page.getByRole("button", { name: COLOR_BUTTON });
      const initialOrder = await palette.evaluateAll((buttons) =>
        buttons.map((button) => (button as HTMLButtonElement).style.backgroundColor)
      );
      const color = (number: number) => palette.nth(number - 1);
      const paint = (x: number, y: number) => paintCell(canvas, input, x, y);

      await paint(0, 0);
      await expect(color(1)).toHaveAttribute("aria-pressed", "true");
      await paint(0, 1);
      await paint(0, 2);
      await paint(0, 3);
      await expect(color(2)).toHaveAttribute("aria-pressed", "true");
      await expect(color(1)).toHaveAccessibleName("Color 1: 4 of 4 cells painted");

      // Restored progress opens on the first unfinished color.
      await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
      await page.reload();
      await expect(color(2)).toHaveAttribute("aria-pressed", "true");

      // Manual selection remains available. Finish color 3 ahead of color 2.
      await color(3).click();
      await page.getByRole("button", { name: "Bucket fill tool" }).click();
      await paint(2, 0);
      await expect(color(4)).toHaveAttribute("aria-pressed", "true");
      await color(2).click();
      await paint(1, 0);
      await expect(color(4)).toHaveAttribute("aria-pressed", "true");
      await expect(color(3)).toHaveAccessibleName("Color 3: 4 of 4 cells painted");

      // Reset, then leave colors 2 and 4 unfinished to exercise wrapping past color 1.
      await page.getByRole("button", { name: "Start over" }).click();
      await page.getByRole("button", { exact: true, name: "Clear" }).click();
      await expect(page.getByRole("group", { name: "0 of 16 pixels painted" })).toBeVisible();
      await color(1).click();
      await paint(0, 0);
      await expect(color(2)).toHaveAttribute("aria-pressed", "true");
      await color(3).click();
      await paint(2, 0);
      await expect(color(4)).toHaveAttribute("aria-pressed", "true");
      // Finish the last pixel while zoomed and panned into the bottom-right corner.
      await page.getByRole("button", { name: "Pencil tool" }).click();
      await paint(3, 0);
      await paint(3, 1);
      await paint(3, 2);
      await page.getByRole("button", { name: "Zoom in tool" }).click();
      await paint(3, 3);
      const overview = page.getByRole("img", {
        name: "Puzzle overview showing the current visible area. Click or drag to pan the board.",
      });
      const overviewBox = await overview.boundingBox();
      if (!overviewBox) {
        throw new Error("The overview has no layout box.");
      }
      await overview.click({ position: { x: overviewBox.width * 0.875, y: overviewBox.height * 0.875 } });
      await page.getByRole("button", { name: "Pencil tool" }).click();
      await expect(canvas).toHaveAttribute("data-zoom", "1.80");
      const beforeBox = await canvas.boundingBox();
      const beforeOverview = await readOverviewTop(overview);
      const zoomedBox = await canvas.boundingBox();
      if (!zoomedBox) {
        throw new Error("The zoomed board has no layout box.");
      }
      const position = { x: zoomedBox.width * 0.875, y: zoomedBox.height * 0.875 };
      if (input === "touch") {
        await canvas.tap({ position });
      } else {
        await canvas.click({ position });
      }
      await expect(color(2)).toHaveAttribute("aria-pressed", "true");
      await expect(canvas).toHaveAttribute("data-zoom", "1.80");
      expect(await canvas.boundingBox()).toEqual(beforeBox);
      expect(await readOverviewTop(overview)).toEqual(beforeOverview);
      await page.getByRole("button", { name: "Zoom out tool" }).click();
      await canvas.click({ position });
      await page.getByRole("button", { name: "Bucket fill tool" }).click();
      await paint(1, 0);
      await expect(color(2)).toHaveAttribute("aria-pressed", "true");
      await expect(page.getByRole("group", { name: "16 of 16 pixels painted" })).toBeVisible();
      await expect(page.getByRole("status").filter({ hasText: COMPLETE })).toBeAttached();
      expect(
        await palette.evaluateAll((buttons) =>
          buttons.map((button) => (button as HTMLButtonElement).style.backgroundColor)
        )
      ).toEqual(initialOrder);
    });
  });
}

async function openPuzzle(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("list", { name: "Built-in artwork" })).toBeVisible();
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("colorwork");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction("artworks", "readwrite");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.objectStore("artworks").put({
          createdAt: Date.now(),
          height: 4,
          id: "auto-color-fixture",
          name: "Auto color fixture",
          palette: ["#ff0000", "#00ff00", "#0000ff", "#ffff00"],
          targetPixels: new Uint8Array([0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3]),
          updatedAt: Date.now(),
          version: 1,
          width: 4,
        });
      });
    } finally {
      database.close();
    }
  });
  await page.goto("/play/auto-color-fixture");
  await expect(page.getByRole("img", { name: BOARD_LABEL })).toBeVisible();
}

async function paintCell(canvas: Locator, input: "mouse" | "touch", x: number, y: number) {
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("The board canvas has no layout box.");
  }
  const position = { x: ((x + 0.5) / 4) * box.width, y: ((y + 0.5) / 4) * box.height };
  if (input === "touch") {
    await canvas.tap({ position });
  } else {
    await canvas.click({ position });
  }
}

function readOverviewTop(overview: Locator) {
  return overview.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("The overview has no drawing context.");
    }
    return [...context.getImageData(0, 0, canvas.width, Math.floor(canvas.height / 2)).data];
  });
}
