import { Buffer } from "node:buffer";
import { expect, type Locator, type Page, test } from "@playwright/test";

const BOARD_LABEL = "Color-by-number puzzle. Choose a tool and interact with cells on the board.";
const GRID_SIDE = 4;
const IMPORTED_URL = /\/play\/two-color-mobile-/;
const PAINTED_ANY = /[1-9][0-9]* of 16 pixels painted/;
const ZOOMED_IN = /^1\.8/;
const FIXTURE = {
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFklEQVR4nGOIrvn1H4Q/Ho8GYwbSBQAv3i8R9w9IPAAAAABJRU5ErkJggg==",
    "base64"
  ),
  mimeType: "image/png",
  name: "two-color-mobile.png",
};

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("mobile Safari smoke", () => {
  test("supports touch painting, pencil dragging, and a scrollable tool rail", async ({ page }) => {
    await openImportedPuzzle(page);

    const canvas = page.getByRole("img", { name: BOARD_LABEL });
    await expect(canvas).toBeVisible();
    const artworkId = new URL(page.url()).pathname.split("/").pop();
    if (!artworkId) {
      throw new Error("The imported artwork URL did not include an id.");
    }

    const adjacentCells = await findAdjacentCells(page, artworkId);
    await page.getByRole("button", { name: new RegExp(`^Color ${adjacentCells.colorIndex + 1}:`) }).tap();

    const boardBox = await canvas.boundingBox();
    if (!boardBox) {
      throw new Error("The board canvas did not receive a layout box.");
    }

    await canvas.tap({ position: relativeCellPosition(adjacentCells.start, boardBox) });
    await expect(page.getByRole("group", { name: "1 of 16 pixels painted" })).toBeVisible();

    await dragCanvas(page, canvas, adjacentCells.start, adjacentCells.end, boardBox);
    await expect(page.getByRole("group", { name: "2 of 16 pixels painted" })).toBeVisible();

    const toolRail = page.locator("main aside").first();
    const railDimensions = await toolRail.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(railDimensions.scrollWidth).toBeGreaterThan(railDimensions.clientWidth);

    await toolRail.evaluate((element) => {
      element.scrollLeft = element.scrollWidth;
    });
    await expect.poll(() => toolRail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  });

  test("supports mobile zoom and panning on a large board", async ({ page }) => {
    await page.goto("/play/ribbit");

    const canvas = page.getByRole("img", { name: BOARD_LABEL });
    const overview = page.getByRole("img", {
      name: "Puzzle overview showing the current visible area. Click or drag to pan the board.",
    });
    await expect(canvas).toBeVisible();
    await expect(overview).toBeVisible();

    await page.getByRole("button", { name: "Zoom in tool" }).tap();
    const initialBox = await canvas.boundingBox();
    if (!initialBox) {
      throw new Error("The board canvas did not receive a layout box.");
    }
    await canvas.tap({ position: { x: initialBox.width / 2, y: initialBox.height / 2 } });
    await expect(canvas).toHaveAttribute("data-zoom", ZOOMED_IN);

    const overviewBeforePan = await overview.screenshot();
    await page.getByRole("button", { name: "Pan tool" }).tap();

    const panBox = await canvas.boundingBox();
    if (!panBox) {
      throw new Error("The board canvas did not receive a layout box after zooming.");
    }
    const start = { x: panBox.x + panBox.width / 2, y: panBox.y + panBox.height / 2 };
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(start.x + 80, start.y + 24, { steps: 6 });
    await page.mouse.up();

    await expect.poll(async () => Buffer.compare(overviewBeforePan, await overview.screenshot())).not.toBe(0);
  });

  test("starts painting when a bucket touch becomes a drag", async ({ page }) => {
    await openImportedPuzzle(page);

    const canvas = page.getByRole("img", { name: BOARD_LABEL });
    const artworkId = new URL(page.url()).pathname.split("/").pop();
    if (!artworkId) {
      throw new Error("The imported artwork URL did not include an id.");
    }

    const adjacentCells = await findAdjacentCells(page, artworkId);
    await page.getByRole("button", { name: new RegExp(`^Color ${adjacentCells.colorIndex + 1}:`) }).tap();
    await page.getByRole("button", { name: "Bucket fill tool" }).tap();

    const boardBox = await canvas.boundingBox();
    if (!boardBox) {
      throw new Error("The board canvas did not receive a layout box.");
    }

    await dispatchTouchPointer(canvas, "pointerdown", adjacentCells.start, boardBox);
    await dispatchTouchPointer(canvas, "pointermove", adjacentCells.end, boardBox);
    await expect(page.getByRole("group", { name: PAINTED_ANY })).toBeVisible();
    await dispatchTouchPointer(canvas, "pointerup", adjacentCells.end, boardBox);
  });

  test("adjusts an image crop with touch input", async ({ page }) => {
    const dialog = await openImportDialog(page);
    await dialog.getByRole("button", { name: "Adjust crop" }).tap();

    const canvas = dialog.getByLabel("Image crop area");
    await dialog.getByRole("slider", { name: "Crop zoom" }).fill("2");
    const beforeMove = await canvas.screenshot();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error("The crop Canvas did not receive a layout box.");
    }

    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await dispatchTouchAtPosition(canvas, "pointerdown", center);
    await dispatchTouchAtPosition(canvas, "pointermove", { x: center.x - 60, y: center.y });
    await dispatchTouchAtPosition(canvas, "pointerup", { x: center.x - 60, y: center.y });
    await expect.poll(async () => Buffer.compare(beforeMove, await canvas.screenshot())).not.toBe(0);

    await dialog.getByRole("button", { name: "Apply crop" }).tap();
    await expect(dialog.getByRole("button", { name: "Edit crop" })).toBeVisible();
    await expect(dialog.getByLabel("Processed pixel art preview")).toBeVisible();
  });

  test("drags an extreme crop ratio from anywhere in the stage", async ({ page }) => {
    const dialog = await openImportDialog(page);
    await dialog.getByRole("button", { name: "Unlock aspect ratio" }).tap();
    await dialog.getByLabel("Width").fill("512");
    await dialog.getByLabel("Height").fill("1");
    await dialog.getByRole("button", { name: "Adjust crop" }).tap();

    const canvas = dialog.getByLabel("Image crop area");
    await dialog.getByRole("slider", { name: "Crop zoom" }).fill("2");
    const beforeMove = await canvas.screenshot();
    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error("The extreme crop Canvas did not receive a layout box.");
    }

    const start = { x: box.x + box.width / 2, y: box.y + 40 };
    const end = { x: start.x + 60, y: start.y };
    await dispatchTouchAtPosition(canvas, "pointerdown", start);
    await dispatchTouchAtPosition(canvas, "pointermove", end);
    await dispatchTouchAtPosition(canvas, "pointerup", end);

    await expect.poll(async () => Buffer.compare(beforeMove, await canvas.screenshot())).not.toBe(0);
  });
});

async function openImportedPuzzle(page: Page) {
  const dialog = await openImportDialog(page);
  await dialog.getByRole("button", { name: "Import this puzzle" }).click();
  await expect(page).toHaveURL(IMPORTED_URL);
  await expect(page.getByRole("heading", { name: "Two Color Mobile" })).toBeVisible();
}

async function openImportDialog(page: Page) {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles(FIXTURE);

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Import this puzzle" })).toBeEnabled();
  return dialog;
}

function findAdjacentCells(page: Page, artworkId: string) {
  return page.evaluate(async (id) => {
    const record = await new Promise<{ height: number; targetPixels: Uint8Array; width: number }>((resolve, reject) => {
      const request = indexedDB.open("colorwork");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const getRequest = request.result.transaction("artworks").objectStore("artworks").get(id);
        getRequest.onerror = () => reject(getRequest.error);
        getRequest.onsuccess = () => resolve(getRequest.result);
      };
    });

    for (let y = 0; y < record.height; y += 1) {
      for (let x = 0; x < record.width - 1; x += 1) {
        const index = y * record.width + x;
        if (record.targetPixels[index] === record.targetPixels[index + 1]) {
          return {
            colorIndex: record.targetPixels[index],
            end: { x: x + 1, y },
            start: { x, y },
          };
        }
      }
    }

    throw new Error("The mobile fixture did not contain adjacent matching cells.");
  }, artworkId);
}

function relativeCellPosition(cell: { x: number; y: number }, box: { height: number; width: number }) {
  return {
    x: ((cell.x + 0.5) / GRID_SIDE) * box.width,
    y: ((cell.y + 0.5) / GRID_SIDE) * box.height,
  };
}

async function dragCanvas(
  page: Page,
  canvas: Locator,
  startCell: { x: number; y: number },
  endCell: { x: number; y: number },
  box: { height: number; width: number; x: number; y: number }
) {
  const start = {
    x: box.x + ((startCell.x + 0.5) / GRID_SIDE) * box.width,
    y: box.y + ((startCell.y + 0.5) / GRID_SIDE) * box.height,
  };
  const end = {
    x: box.x + ((endCell.x + 0.5) / GRID_SIDE) * box.width,
    y: box.y + ((endCell.y + 0.5) / GRID_SIDE) * box.height,
  };

  await canvas.scrollIntoViewIfNeeded();
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 4 });
  await page.mouse.up();
}

async function dispatchTouchPointer(
  canvas: Locator,
  type: "pointerdown" | "pointermove" | "pointerup",
  cell: { x: number; y: number },
  box: { height: number; width: number; x: number; y: number }
) {
  const position = {
    x: box.x + ((cell.x + 0.5) / GRID_SIDE) * box.width,
    y: box.y + ((cell.y + 0.5) / GRID_SIDE) * box.height,
  };

  await dispatchTouchAtPosition(canvas, type, position);
}

async function dispatchTouchAtPosition(
  canvas: Locator,
  type: "pointerdown" | "pointermove" | "pointerup",
  position: { x: number; y: number }
) {
  await canvas.evaluate(
    (element, pointer) => {
      const board = element as HTMLCanvasElement;
      if (pointer.type === "pointerdown") {
        board.setPointerCapture = () => undefined;
        board.hasPointerCapture = () => false;
      }
      board.dispatchEvent(
        new PointerEvent(pointer.type, {
          bubbles: true,
          button: 0,
          buttons: pointer.type === "pointerup" ? 0 : 1,
          clientX: pointer.x,
          clientY: pointer.y,
          isPrimary: true,
          pointerId: 1,
          pointerType: "touch",
        })
      );
    },
    { ...position, type }
  );
}
