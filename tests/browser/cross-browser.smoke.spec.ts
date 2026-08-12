import { Buffer } from "node:buffer";
import { expect, type Page, test } from "@playwright/test";

const BOARD_LABEL = "Color-by-number puzzle. Choose a tool and interact with cells on the board.";
const GRID_SIDE = 4;
const IMPORTED_URL = /\/play\/two-color-smoke-/;
const TWO_COLOR_SMOKE_BUTTON = /^Two Color Smoke/;
const FIXTURE = {
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFklEQVR4nGOIrvn1H4Q/Ho8GYwbSBQAv3i8R9w9IPAAAAABJRU5ErkJggg==",
    "base64"
  ),
  mimeType: "image/png",
  name: "two-color-smoke.png",
};
const IMAGE_FIXTURES = [
  { fileName: "jpeg-smoke.jpg", label: "JPEG", mimeType: "image/jpeg", transparent: false },
  { fileName: "transparent-smoke.png", label: "transparent PNG", mimeType: "image/png", transparent: true },
] as const;
const WEBP_FIXTURE = {
  buffer: Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64"),
  label: "WebP",
  mimeType: "image/webp",
  name: "webp-smoke.webp",
};

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("cross-browser smoke", () => {
  test("opens and closes the full-artwork dialog", async ({ page }) => {
    await page.goto("/");

    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    await expect(preview).toBeVisible();
    await preview.getByRole("button", { name: "See full artwork" }).click();

    const dialog = page.getByRole("dialog", { name: "Gobbo, full artwork" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("img", { name: "Gobbo, fully colored" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("imports, paints, and reloads a puzzle", async ({ page }) => {
    await openImportedPuzzle(page);

    await expect(page).toHaveURL(IMPORTED_URL);
    await expect(page.getByRole("heading", { name: "Two Color Smoke" })).toBeVisible();

    const canvas = page.getByRole("img", { name: BOARD_LABEL });
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).width)).toBeGreaterThan(0);

    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error("The board canvas did not receive a layout box.");
    }

    const position = { x: box.width / 2, y: box.height / 2 };
    await canvas.click({ button: "middle", position });
    await canvas.click({ position });
    await expect(page.getByRole("group", { name: "1 of 16 pixels painted" })).toBeVisible();

    const artworkId = new URL(page.url()).pathname.split("/").pop();
    if (!artworkId) {
      throw new Error("The imported artwork URL did not include an id.");
    }

    await expect.poll(() => hasStoredArtwork(page, artworkId)).toBe(true);
    await expect.poll(() => hasStoredProgress(page, artworkId)).toBe(true);
    await page.reload();
    await expect(page.getByRole("group", { name: "1 of 16 pixels painted" })).toBeVisible();
  });

  test("renames imported artwork with keyboard controls", async ({ page }) => {
    await openImportedPuzzle(page);

    const rename = page.getByRole("heading").getByRole("button");
    await rename.click();
    const input = page.getByRole("textbox", { name: "Artwork name" });
    await input.fill("Renamed Smoke");
    await page.keyboard.press("Enter");
    await expect(rename).toHaveText("Renamed Smoke");

    await rename.click();
    await input.fill("Discarded name");
    await page.keyboard.press("Escape");
    await expect(rename).toHaveText("Renamed Smoke");
    await expect(rename).toBeFocused();
  });

  test("deletes imported artwork", async ({ page }) => {
    await openImportedPuzzle(page);

    await page.getByRole("link", { name: "All artworks" }).click();
    await page.getByRole("button", { name: TWO_COLOR_SMOKE_BUTTON }).click();

    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    await preview.getByRole("button", { name: "Delete artwork" }).click();
    await preview.getByRole("button", { name: "Yes, delete it" }).click();

    await expect(page.getByRole("button", { name: TWO_COLOR_SMOKE_BUTTON })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: TWO_COLOR_SMOKE_BUTTON })).toHaveCount(0);
  });

  test("uses pencil, bucket, and picker tools on the Canvas board", async ({ page }) => {
    await openImportedPuzzle(page);

    await paintCell(page, 0, 0);
    await expect(page.getByRole("group", { name: "1 of 16 pixels painted" })).toBeVisible();

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
  });

  for (const fixture of IMAGE_FIXTURES) {
    test(`imports ${fixture.label} images and can cancel the dialog`, async ({ page }) => {
      await page.goto("/");
      await uploadGeneratedImage(page, fixture);

      await cancelImportDialog(page, fixture.fileName, fixture.transparent);
    });
  }

  test("imports WebP images and can cancel the dialog", async ({ page }) => {
    await page.goto("/");
    await page.locator('input[type="file"]').setInputFiles(WEBP_FIXTURE);
    await cancelImportDialog(page, WEBP_FIXTURE.name, false);
  });
});

async function openImportedPuzzle(page: Page) {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Import this puzzle" })).toBeEnabled();
  await dialog.getByRole("button", { name: "Import this puzzle" }).click();
}

async function paintCell(page: Page, x: number, y: number) {
  const canvas = page.getByRole("img", { name: BOARD_LABEL });
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("The board canvas did not receive a layout box.");
  }

  await page.mouse.click(box.x + ((x + 0.5) / GRID_SIDE) * box.width, box.y + ((y + 0.5) / GRID_SIDE) * box.height);
}

async function uploadGeneratedImage(page: Page, fixture: (typeof IMAGE_FIXTURES)[number]) {
  await expect(page.locator('input[type="file"]')).toBeAttached();
  await page.evaluate(async ({ fileName, mimeType, transparent }) => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = transparent ? 1 : 2;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare the image fixture.");
    }

    if (transparent) {
      context.fillStyle = "#ff0000";
      context.fillRect(0, 0, 1, 1);
    } else {
      context.fillStyle = "#8cad99";
      context.fillRect(0, 0, 2, 2);
      context.fillStyle = "#c27a51";
      context.fillRect(1, 1, 1, 1);
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("Could not encode the fixture."))),
        mimeType
      );
    });
    if (blob.type !== mimeType) {
      throw new Error(`The browser could not encode a ${mimeType} fixture.`);
    }

    const file = new File([blob], fileName, { type: mimeType });
    const transfer = new DataTransfer();
    transfer.items.add(file);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) {
      throw new Error("The image import input was not found.");
    }
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, fixture);
}

async function cancelImportDialog(page: Page, fileName: string, transparent: boolean) {
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(fileName)).toBeVisible();
  await expect(dialog.locator('canvas[aria-label="Processed pixel art preview"]')).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Import this puzzle" })).toBeEnabled();

  if (transparent) {
    await expect(dialog.getByText("Generated palette (2)")).toBeVisible();
  }

  await dialog.getByRole("button", { exact: true, name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
}

function hasStoredArtwork(page: Page, artworkId: string) {
  return page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("colorwork");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    try {
      return await new Promise<boolean>((resolve, reject) => {
        const request = database.transaction("artworks").objectStore("artworks").get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result !== undefined);
      });
    } finally {
      database.close();
    }
  }, artworkId);
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
