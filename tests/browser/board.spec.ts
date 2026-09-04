import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";

const BOARD_LABEL = "Color-by-number puzzle. Choose a tool and interact with cells on the board.";
const EVENING_TILES_BUTTON = /^Evening Tiles/;
const IMPORTED_URL = /\/play\/two-color-fixture-/;
const MAX_LENGTH_NAME = "Sunset Over The Harbour With Boats And A Tall Lighthouse Abc";
const PAINT_ACTION_LINK = /^(Keep painting|Start painting)$/;
const PAINTED_ANY = /[1-9][0-9,]* of [0-9,]+ pixels painted/;
const RIBBIT_BUTTON = /^Ribbit/;
const TWO_COLOR_FIXTURE_BUTTON = /^Two Color Fixture/;
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
    const artworkId = new URL(page.url()).pathname.split("/").pop();
    if (!artworkId) {
      throw new Error("The imported artwork URL did not include an id.");
    }

    await expect(page.getByRole("button", { name: "Finish the artwork to download" })).toBeDisabled();

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
    await expect(page.getByText("First finish", { exact: true })).toBeVisible();
    await expect(page.getByText("Custom finish", { exact: true })).toBeVisible();

    const downloadButton = page.getByRole("button", { name: "Download artwork" });
    await expect(downloadButton).toBeVisible();
    await expect(downloadButton).toBeEnabled();
    const downloadEvent = page.waitForEvent("download");
    await downloadButton.click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe("two-color-fixture.png");

    const downloadPath = await download.path();
    if (!downloadPath) {
      throw new Error("The completed artwork download did not create a file.");
    }
    const png = await readFile(downloadPath);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1024);
    expect(png.readUInt32BE(20)).toBe(1024);

    await expect.poll(() => getStoredPaintedCount(page, artworkId)).toBe(16);
    await page.getByRole("link", { name: "All artworks" }).click();
    await page.getByRole("button", { name: TWO_COLOR_FIXTURE_BUTTON }).click();

    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    await expect(preview.getByRole("button", { name: "Download artwork" })).toBeVisible();
    await page.getByRole("button", { name: RIBBIT_BUTTON }).click();
    await expect(preview.getByRole("button", { name: "Download artwork" })).toHaveCount(0);

    await page.getByRole("link", { exact: true, name: "Achievements" }).click();
    await expect(page.getByRole("heading", { name: "2 of 8 unlocked" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "First finish" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Custom finish" })).toBeVisible();

    await page.getByRole("button", { name: "Clear history" }).click();
    await expect(page).toHaveURL("/");
    await expect.poll(() => getAchievementHistoryCounts(page)).toEqual({ completions: 0, unlocks: 0 });
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

  test("renames imported artwork without disturbing the live board", async ({ page }) => {
    await page.setViewportSize({ height: 880, width: 945 });
    await openImportedPuzzle(page);
    const artworkUrl = page.url();
    const headerLocator = page.locator("header");
    const canvas = page.getByRole("img", { name: BOARD_LABEL });
    // The title is the rename control, so it carries no width or height of its own.
    const rename = page.getByRole("heading").getByRole("button");
    const saveStatus = page.getByRole("status");
    const importedTitle = page.getByRole("heading", { name: "Two Color Fixture" });
    const [initialHeaderBox, initialCanvasBox, initialSaveStatusBox, renameBox, importedTitleBox] = await Promise.all([
      headerLocator.boundingBox(),
      canvas.boundingBox(),
      saveStatus.boundingBox(),
      rename.boundingBox(),
      importedTitle.boundingBox(),
    ]);
    if (!(initialHeaderBox && initialCanvasBox && initialSaveStatusBox && renameBox && importedTitleBox)) {
      throw new Error("The desktop board header did not receive its initial layout boxes.");
    }
    // Pins the no-credit desktop header geometry from before imported artwork could be renamed.
    expect(initialHeaderBox.height).toBe(69);
    expect(initialCanvasBox.y).toBe(105);
    expect(importedTitleBox.y).toBe(48);
    expect(importedTitleBox.height).toBe(24);
    expect(renameBox).toEqual(importedTitleBox);
    expect(initialSaveStatusBox.x - (renameBox.x + renameBox.width)).toBe(8);

    await rename.click();
    const nameInput = page.getByRole("textbox", { name: "Artwork name" });
    const cancel = page.getByRole("button", { name: "Cancel" });
    const save = page.getByRole("button", { name: "Save" });
    await expect(nameInput).toBeFocused();
    await expect(cancel.locator("svg + span")).toBeVisible();
    await expect(save.locator("svg + span")).toBeVisible();
    const [inputBox, cancelBox, saveBox] = await Promise.all([
      nameInput.boundingBox(),
      cancel.boundingBox(),
      save.boundingBox(),
    ]);
    // The field takes the title's exact place; only its actions are taller than the title line.
    expect(inputBox).toEqual(importedTitleBox);
    expect(cancelBox?.height).toBe(40);
    expect(saveBox?.height).toBe(40);
    expect(await headerLocator.boundingBox()).toEqual(initialHeaderBox);
    expect(await canvas.boundingBox()).toEqual(initialCanvasBox);
    await expect(saveStatus).toBeHidden();
    // Below `lg` the board actions yield the row to the name.
    await expect(page.getByRole("button", { name: "Start over" })).toBeHidden();
    await expect(page.getByRole("group", { name: "0 of 16 pixels painted" })).toBeHidden();
    await expect
      .poll(() =>
        nameInput.evaluate((input) => ({
          end: (input as HTMLInputElement).selectionEnd,
          length: (input as HTMLInputElement).value.length,
          start: (input as HTMLInputElement).selectionStart,
        }))
      )
      .toEqual({ end: 17, length: 17, start: 0 });

    await nameInput.fill("Discard this name");
    await page.keyboard.press("Escape");
    await expect(rename).toHaveText("Two Color Fixture");
    await expect(rename).toBeFocused();
    expect(await saveStatus.boundingBox()).toEqual(initialSaveStatusBox);
    await expect(page.getByRole("button", { name: "Start over" })).toBeVisible();
    await expect(page.getByRole("group", { name: "0 of 16 pixels painted" })).toBeVisible();

    await rename.click();
    await nameInput.fill("Discard this one too");
    await canvas.click({ position: { x: 2, y: 2 } });
    await expect(nameInput).toBeHidden();
    await expect(rename).toHaveText("Two Color Fixture");

    await page.getByRole("button", { name: "Zoom in tool" }).click();
    await canvas.click({ position: { x: 10, y: 10 } });
    await expect(canvas).toHaveAttribute("data-zoom", ZOOMED_IN);

    await rename.click();
    await nameInput.fill("Failure preview");
    const headerHeight = await page.locator("header").evaluate((header) => header.getBoundingClientRect().height);
    await page.evaluate(() => {
      const originalPut = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function failOnce() {
        IDBObjectStore.prototype.put = originalPut;
        throw new DOMException("Simulated storage failure", "QuotaExceededError");
      };
    });
    await page.getByRole("button", { name: "Save" }).click();
    await expect(nameInput).toHaveAttribute("aria-invalid", "true");
    await expect(nameInput).toHaveCSS("animation-duration", "0.24s");
    await expect(page.getByRole("alert").filter({ hasText: "Couldn’t rename artwork. Try again." })).toBeVisible();
    // Saving disables the field, so the failure has to hand focus back rather than drop it on the body.
    await expect(nameInput).toBeFocused();
    await expect
      .poll(() => page.locator("header").evaluate((header) => header.getBoundingClientRect().height))
      .toBe(headerHeight);

    await nameInput.fill("  Evening Tiles  ");
    await expect(nameInput).not.toHaveAttribute("aria-invalid");
    await page.keyboard.press("Enter");

    await expect(rename).toHaveText("Evening Tiles");
    await expect(page).toHaveTitle("Evening Tiles - Colorwork");
    await expect(page).toHaveURL(artworkUrl);
    await expect(canvas).toHaveAttribute("data-zoom", ZOOMED_IN);
    await expect(rename).toBeFocused();

    await page.getByRole("link", { name: "All artworks" }).click();
    const imported = page.getByRole("list", { name: "Your artwork" });
    await expect(imported.getByRole("button", { name: EVENING_TILES_BUTTON })).toBeVisible();
    await expect(imported.getByRole("button", { name: TWO_COLOR_FIXTURE_BUTTON })).toHaveCount(0);

    await imported.getByRole("button", { name: EVENING_TILES_BUTTON }).click();
    await page.setViewportSize({ height: 880, width: 1440 });
    await page
      .getByRole("complementary", { name: "Artwork preview" })
      .getByRole("link", { name: PAINT_ACTION_LINK })
      .click();
    await expect(page).toHaveURL(artworkUrl);
    await expect(page.getByRole("heading", { name: "Evening Tiles" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Evening Tiles" })).toBeVisible();

    await page.goto("/play/ribbit");
    await expect(page.getByRole("heading", { name: "Ribbit" })).toBeVisible();
    await expect(page.getByRole("heading").getByRole("button")).toHaveCount(0);
  });

  test("sizes long names to their text and gives short names a clear editing surface", async ({ page }) => {
    await page.setViewportSize({ height: 880, width: 1440 });
    await openImportedPuzzle(page);

    const trigger = page.getByRole("heading").getByRole("button");
    const input = page.getByRole("textbox", { name: "Artwork name" });
    await trigger.click();
    await input.fill(MAX_LENGTH_NAME);
    await page.keyboard.press("Enter");
    await expect(trigger).toHaveText(MAX_LENGTH_NAME);

    // A name at the limit is far wider than any fixed field, so the field is sized by its text.
    const titleBox = await trigger.boundingBox();
    await trigger.click();
    expect(await input.boundingBox()).toEqual(titleBox);
    // From `lg` up the row holds both, so the board actions stay put while the name is edited.
    await expect(page.getByRole("button", { name: "Start over" })).toBeVisible();
    await expect(page.getByRole("group", { name: "0 of 16 pixels painted" })).toBeVisible();

    await input.fill("Short");
    await page.keyboard.press("Enter");
    const shortTitleBox = await trigger.boundingBox();
    await trigger.click();
    const shortInputBox = await input.boundingBox();
    if (!(shortInputBox && shortTitleBox)) {
      throw new Error("The short artwork name did not receive its read and edit layout boxes.");
    }
    expect(shortInputBox.width).toBeGreaterThan(shortTitleBox.width);
    expect(shortInputBox.width).toBeGreaterThanOrEqual(192);
  });

  test("keeps mobile rename actions inline without shrinking their touch targets", async ({ page }) => {
    await page.setViewportSize({ height: 568, width: 320 });
    await openImportedPuzzle(page);

    const header = page.locator("header");
    const initialHeaderHeight = await header.evaluate((element) => element.getBoundingClientRect().height);
    const rename = page.getByRole("heading").getByRole("button");
    const titleBox = await rename.boundingBox();
    if (!titleBox) {
      throw new Error("The mobile artwork title did not receive a layout box.");
    }

    // The title keeps its own height; a pseudo-element carries the touch target above and below it.
    expect(titleBox.height).toBeLessThan(24);
    await page.mouse.click(titleBox.x + 4, titleBox.y - 10);

    const input = page.getByRole("textbox", { name: "Artwork name" });
    await expect(input).toBeFocused();
    const cancel = page.getByRole("button", { name: "Cancel" });
    const save = page.getByRole("button", { name: "Save" });
    const [inputBox, cancelBox, saveBox] = await Promise.all([
      input.boundingBox(),
      cancel.boundingBox(),
      save.boundingBox(),
    ]);
    if (!(inputBox && cancelBox && saveBox)) {
      throw new Error("The mobile rename controls did not receive layout boxes.");
    }

    expect(inputBox.width).toBeGreaterThan(0);
    expect(cancelBox.width).toBe(48);
    expect(saveBox.width).toBe(48);
    // Full-size touch targets centred on the name, which keeps the title line's own height.
    expect(cancelBox.height).toBe(48);
    expect(saveBox.height).toBe(48);
    expect(cancelBox.y + cancelBox.height / 2).toBe(inputBox.y + inputBox.height / 2);
    expect(saveBox.y + saveBox.height / 2).toBe(inputBox.y + inputBox.height / 2);
    const headerBox = await header.boundingBox();
    expect(saveBox.x + saveBox.width).toBeLessThanOrEqual((headerBox?.x ?? 0) + (headerBox?.width ?? 0));
    await expect(page.getByRole("button", { name: "Start over" })).toBeHidden();
    await expect(page.getByRole("group", { name: "0 of 16 pixels painted" })).toBeHidden();
    await expect
      .poll(() => header.evaluate((element) => element.getBoundingClientRect().height))
      .toBe(initialHeaderHeight);
    // The title line reserves no more height than the name needs, so the controls overhang it into
    // the header's padding. They have to stop short of the rule.
    const headerBottom = await header.evaluate((element) => element.getBoundingClientRect().bottom);
    expect(saveBox.y + saveBox.height).toBeLessThan(headerBottom);

    await cancel.click();
    await expect(page.getByRole("button", { name: "Start over" })).toBeVisible();
    await expect(page.getByRole("group", { name: "0 of 16 pixels painted" })).toBeVisible();
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

  test("clears progress without leaving the board", async ({ page }) => {
    await openImportedPuzzle(page);
    const artworkId = new URL(page.url()).pathname.split("/").pop();
    if (!artworkId) {
      throw new Error("The imported artwork URL did not include an id.");
    }

    await paintCell(page, 0, 0);
    await expect(page.getByRole("group", { name: "1 of 16 pixels painted" })).toBeVisible();

    const startOver = page.getByRole("button", { name: "Start over" });
    const confirmation = page.getByRole("dialog", { name: "Start over" });
    const clear = page.getByRole("button", { exact: true, name: "Clear" });

    await startOver.click();
    await expect(confirmation).toBeVisible();
    await expect(startOver).toHaveAttribute("aria-haspopup", "dialog");
    const confirmationId = await confirmation.getAttribute("id");
    expect(confirmationId).toBeTruthy();
    await expect(startOver).toHaveAttribute("aria-controls", confirmationId ?? "");
    await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(clear).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(confirmation).toBeHidden();

    await startOver.focus();
    await startOver.click();
    await expect(confirmation).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(confirmation).toBeHidden();
    await expect(startOver).toBeFocused();

    await startOver.click();
    await page.getByRole("img", { name: BOARD_LABEL }).click({ position: { x: 2, y: 2 } });
    await expect(confirmation).toBeHidden();
    await expect(page.getByRole("group", { name: PAINTED_ANY })).toBeVisible();

    await startOver.click();
    await clear.click();
    await expect(page.getByRole("group", { name: "0 of 16 pixels painted" })).toBeVisible();
    await expect(confirmation).toBeHidden();
    await expect(startOver).toBeDisabled();
    await expect.poll(() => hasStoredProgress(page, artworkId)).toBe(false);
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

function getAchievementHistoryCounts(page: Page) {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("colorwork");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    try {
      const transaction = database.transaction(["achievementUnlocks", "puzzleCompletions"]);
      const count = (storeName: "achievementUnlocks" | "puzzleCompletions") =>
        new Promise<number>((resolve, reject) => {
          const request = transaction.objectStore(storeName).count();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });
      const [unlocks, completions] = await Promise.all([count("achievementUnlocks"), count("puzzleCompletions")]);

      return { completions, unlocks };
    } finally {
      database.close();
    }
  });
}

function getStoredPaintedCount(page: Page, artworkId: string) {
  return page.evaluate(async (id) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("colorwork");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });

    try {
      return await new Promise<number | undefined>((resolve, reject) => {
        const request = database.transaction("progress").objectStore("progress").get(id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const paintedCells = request.result?.paintedCells as Uint8Array | undefined;
          if (!paintedCells) {
            resolve(undefined);
            return;
          }

          let paintedCount = 0;
          for (const byte of paintedCells) {
            let remaining = byte;
            while (remaining > 0) {
              paintedCount += remaining % 2;
              remaining = Math.floor(remaining / 2);
            }
          }
          resolve(paintedCount);
        };
      });
    } finally {
      database.close();
    }
  }, artworkId);
}
