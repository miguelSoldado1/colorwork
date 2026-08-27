import { expect, type Page, test } from "@playwright/test";

const PLAY_URL = /\/play\/[^/]+$/;
const RENAMED_IMPORT_URL = /\/play\/joao-s-cafe-da-manha-[a-z0-9]+$/;
const ROOT_URL = /\/$/;
const RIBBIT_BUTTON = /^Ribbit/;
const GOBBO_BUTTON = /^Gobbo/;
const WIDE_FIXTURE_BUTTON = /^Wide Fixture/;

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("artwork catalog", () => {
  test("shows a default preview and keeps selection client-side", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Artworks" })).toBeVisible();
    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    await expect(preview).toBeVisible();
    await expect(preview.getByRole("heading", { name: "Gobbo" })).toBeVisible();

    await page.getByRole("button", { name: RIBBIT_BUTTON }).click();
    await expect(page).toHaveURL(ROOT_URL);
    await expect(preview.getByRole("heading", { name: "Ribbit" })).toBeVisible();

    await preview.getByRole("button", { name: "See full artwork" }).click();
    const reveal = page.getByRole("dialog", { name: "Ribbit, full artwork" });
    await expect(reveal.getByRole("img", { name: "Ribbit, fully colored" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(reveal).toBeHidden();

    await page.getByRole("button", { name: GOBBO_BUTTON }).click();
    await expect(page).toHaveURL(ROOT_URL);
    await expect(preview.getByRole("heading", { name: "Gobbo" })).toBeVisible();
    await expect(preview.getByRole("button", { name: "See full artwork" })).toBeVisible();
  });

  test("keeps the selected artwork action visible while browsing on phones", async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto("/");

    const selectedAction = page.getByRole("region", { name: "Selected artwork action" });
    const artworkList = page.getByRole("list", { name: "Built-in artwork" });
    const preview = page.getByRole("complementary", { name: "Artwork preview" });

    await expect(selectedAction).toContainText("Gobbo");
    await expect(selectedAction.getByRole("link", { name: "Start painting" })).toBeInViewport();
    await expect
      .poll(async () => {
        const listBox = await artworkList.boundingBox();
        const previewBox = await preview.boundingBox();
        return listBox && previewBox ? listBox.y < previewBox.y : false;
      })
      .toBe(true);

    const ribbit = page.getByRole("button", { name: RIBBIT_BUTTON });
    await ribbit.scrollIntoViewIfNeeded();
    await ribbit.click();

    await expect(selectedAction).toContainText("Ribbit");
    await expect(selectedAction.getByRole("link", { name: "Start painting" })).toBeInViewport();
  });

  test("keeps the tapped row in place when selecting an artwork", async ({ page }) => {
    await page.setViewportSize({ height: 952, width: 539 });
    await page.goto("/");

    const ribbit = page.getByRole("button", { name: RIBBIT_BUTTON });
    await ribbit.scrollIntoViewIfNeeded();
    const scrollY = await page.evaluate(() => window.scrollY);
    await ribbit.click();
    await expect(page).toHaveURL(ROOT_URL);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(scrollY);
    await expect(page.getByRole("heading", { name: "Ribbit" })).toBeVisible();
  });

  test("keeps color numbers out of the artwork preview", async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 });
    await page.goto("/");

    const canvas = page.getByRole("complementary", { name: "Artwork preview" }).locator("canvas");
    await expect.poll(() => canvas.evaluate((element) => (element as HTMLCanvasElement).width)).toBeGreaterThan(0);

    const hasNonGrayPixel = await canvas.evaluate((element) => {
      const preview = element as HTMLCanvasElement;
      const context = preview.getContext("2d");
      if (!context) {
        throw new Error("Could not read the artwork preview.");
      }

      const pixels = context.getImageData(0, 0, preview.width, preview.height).data;
      for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index] !== pixels[index + 1] || pixels[index + 1] !== pixels[index + 2]) {
          return true;
        }
      }
      return false;
    });

    expect(hasNonGrayPixel).toBe(false);
  });

  test("uses the full import budget and constrains unlocked dimensions", async ({ page }) => {
    await page.goto("/");
    await uploadGeneratedImage(page, 1000, 250);

    const dialog = page.getByRole("dialog");
    const width = dialog.getByLabel("Width");
    const height = dialog.getByLabel("Height");
    await expect(width).toHaveValue("512");
    await expect(height).toHaveValue("128");

    await dialog.getByRole("button", { name: "Unlock aspect ratio" }).click();
    await height.fill("512");
    await expect(width).toHaveValue("128");
    await expect(height).toHaveValue("512");

    await width.fill("512");
    await expect(width).toHaveValue("512");
    await expect(height).toHaveValue("128");
  });

  test("keeps the grid usable while replacing the width", async ({ page }) => {
    await page.goto("/");
    await uploadGeneratedImage(page, 1000, 250);

    const dialog = page.getByRole("dialog");
    const width = dialog.getByLabel("Width");
    const height = dialog.getByLabel("Height");

    await width.fill("");
    await expect(width).toHaveValue("");
    await expect(height).toHaveValue("128");

    await width.pressSequentially("256");
    await expect(width).toHaveValue("256");
    await expect(height).toHaveValue("64");
  });

  test("uses the semantic canvas color behind transparent imports", async ({ page }) => {
    await page.goto("/");
    await uploadGeneratedImage(page, 2, 1, true);

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Generated palette (2)")).toBeVisible();

    const colors = await dialog.locator("canvas").evaluate((preview) => {
      const previewContext = (preview as HTMLCanvasElement).getContext("2d");
      if (!previewContext) {
        throw new Error("Could not read the import preview.");
      }

      const reference = document.createElement("canvas");
      reference.width = 1;
      reference.height = 1;
      const referenceContext = reference.getContext("2d");
      if (!referenceContext) {
        throw new Error("Could not prepare the theme color reference.");
      }

      referenceContext.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--color-canvas");
      referenceContext.fillRect(0, 0, 1, 1);

      return {
        imported: Array.from(previewContext.getImageData(1, 0, 1, 1).data),
        theme: Array.from(referenceContext.getImageData(0, 0, 1, 1).data),
      };
    });

    expect(colors.imported).toEqual(colors.theme);
  });

  test("restores the processed preview after canceling crop adjustments", async ({ page }) => {
    await page.goto("/");
    await uploadGeneratedImage(page, 8, 8);

    const dialog = page.getByRole("dialog");
    const preview = dialog.getByLabel("Processed pixel art preview");
    await expect(preview).toBeVisible();
    await expect.poll(async () => (await readPreviewEdgeColors(preview)).left[3]).toBe(255);
    const beforeCrop = await readPreviewEdgeColors(preview);

    await dialog.getByRole("button", { name: "Adjust crop" }).click();
    await dialog.getByRole("button", { exact: true, name: "Cancel" }).click();

    await expect(preview).toBeVisible();
    await expect.poll(() => readPreviewEdgeColors(preview)).toEqual(beforeCrop);
  });

  test("crops an imported image and recenters it from the crop editor", async ({ page }) => {
    await page.goto("/");
    await uploadColorBands(page);

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Unlock aspect ratio" }).click();
    await dialog.getByLabel("Height").fill("4");
    await dialog.getByRole("button", { name: "Adjust crop" }).click();

    const cropCanvas = dialog.getByLabel("Image crop area");
    await expect(cropCanvas).toBeFocused();
    // Cropping replaces the import actions, so the puzzle cannot be imported mid-adjustment.
    await expect(dialog.getByRole("button", { name: "Import this puzzle" })).toHaveCount(0);

    const box = await cropCanvas.boundingBox();
    if (!box) {
      throw new Error("The crop Canvas did not receive a layout box.");
    }

    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(center.x, center.y);
    await page.mouse.down();
    await page.mouse.move(center.x - (box.height - 36) / 2, center.y, { steps: 6 });
    await page.mouse.up();
    await dialog.getByRole("button", { name: "Apply crop" }).click();

    await expect(dialog.getByRole("button", { name: "Import this puzzle" })).toBeDisabled();
    await expect(dialog.getByText("Generated palette (2)")).toBeVisible();
    await expect
      .poll(() => readPreviewEdgeColors(dialog.locator('canvas[aria-label="Processed pixel art preview"]')))
      .toEqual({
        left: [0, 0, 255, 255],
        right: [255, 255, 0, 255],
      });

    await dialog.getByRole("button", { name: "Edit crop" }).click();
    await dialog.getByRole("button", { name: "Reset" }).click();
    await dialog.getByRole("button", { name: "Apply crop" }).click();
    await expect
      .poll(() => readPreviewEdgeColors(dialog.locator('canvas[aria-label="Processed pixel art preview"]')))
      .toEqual({
        left: [0, 255, 0, 255],
        right: [0, 0, 255, 255],
      });
  });

  test("updates the palette capacity for colors revealed by a crop", async ({ page }) => {
    await page.goto("/");
    await uploadHiddenCropColors(page);

    const dialog = page.getByRole("dialog");
    const paletteSize = dialog.getByRole("slider", { name: "Palette colors" });
    await expect(paletteSize).toHaveAttribute("max", "2");
    await expect(paletteSize).toHaveValue("2");
    await expect(dialog.getByText("Generated palette (2)")).toBeVisible();

    await dialog.getByRole("button", { name: "Adjust crop" }).click();
    await dialog.getByRole("slider", { name: "Crop zoom" }).fill("4");
    await dialog.getByRole("button", { name: "Apply crop" }).click();

    await expect(paletteSize).toHaveAttribute("max", "4");
    await expect(paletteSize).toHaveValue("4");
    await expect(paletteSize).toBeEnabled();
    await expect(dialog.getByText("Generated palette (4)")).toBeVisible();
  });

  test("applies the latest crop gesture before its preview frame renders", async ({ page }) => {
    await page.goto("/");
    await uploadColorBands(page);

    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Adjust crop" }).click();
    const cropCanvas = dialog.getByLabel("Image crop area");
    await expect(cropCanvas).toBeFocused();

    await cropCanvas.evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      const bounds = canvas.getBoundingClientRect();
      canvas.dispatchEvent(
        new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          clientX: bounds.left + bounds.width / 2,
          clientY: bounds.top + bounds.height / 2,
          deltaY: -500,
        })
      );
      const apply = Array.from(canvas.closest("dialog")?.querySelectorAll("button") ?? []).find((button) =>
        button.textContent?.includes("Apply crop")
      );
      apply?.click();
    });

    await dialog.getByRole("button", { name: "Edit crop" }).click();
    await expect
      .poll(async () => Number(await dialog.getByRole("slider", { name: "Crop zoom" }).inputValue()))
      .toBeGreaterThan(2);
  });

  test("persists imported artwork across reloads and includes it in the catalog", async ({ page }) => {
    await page.goto("/");
    await uploadGeneratedImage(page, 8, 8);

    await page.getByRole("dialog").getByRole("button", { name: "Import this puzzle" }).click();
    await expect(page).toHaveURL(PLAY_URL);
    await expect(page.getByRole("heading", { name: "Wide Fixture" })).toBeVisible();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Wide Fixture" })).toBeVisible();

    await page.getByRole("link", { name: "All artworks" }).click();
    const imported = page.getByRole("list", { name: "Your artwork" });
    const importedArtwork = imported.getByRole("button", { name: WIDE_FIXTURE_BUTTON });
    await expect(importedArtwork).toBeVisible();
    const catalog = page.getByRole("list", { name: "Built-in artwork" });
    await expect(catalog.getByRole("button", { name: WIDE_FIXTURE_BUTTON })).toHaveCount(0);

    await importedArtwork.click();
    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    await expect(preview.getByRole("button", { name: "Finish the artwork to download" })).toBeDisabled();
  });

  test("uses the edited puzzle name in the imported artwork id", async ({ page }) => {
    await page.goto("/");
    await uploadGeneratedImage(page, 8, 8);

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Puzzle name").fill("João's Café da Manhã");
    await dialog.getByRole("button", { name: "Import this puzzle" }).click();

    await expect(page).toHaveURL(RENAMED_IMPORT_URL);
    await expect(page.getByRole("heading", { name: "João's Café da Manhã" })).toBeVisible();
  });

  test("deletes imported artwork and offers no delete for the built-in catalog", async ({ page }) => {
    await page.goto("/");
    await uploadGeneratedImage(page, 8, 8);
    await page.getByRole("dialog").getByRole("button", { name: "Import this puzzle" }).click();
    await expect(page).toHaveURL(PLAY_URL);

    await page.getByRole("link", { name: "All artworks" }).click();
    const preview = page.getByRole("complementary", { name: "Artwork preview" });
    await page.getByRole("button", { name: WIDE_FIXTURE_BUTTON }).click();
    await expect(preview.getByRole("heading", { name: "Wide Fixture" })).toBeVisible();

    await preview.getByRole("button", { name: "Delete artwork" }).click();
    await preview.getByRole("button", { name: "Yes, delete it" }).click();

    await expect(page.getByRole("list", { name: "Your artwork" })).toBeHidden();
    await expect(page.getByRole("button", { name: WIDE_FIXTURE_BUTTON })).toHaveCount(0);

    // A built-in artwork now holds the preview, and it must not expose the control.
    await expect(preview.getByRole("button", { name: "Delete artwork" })).toHaveCount(0);

    await page.reload();
    await expect(page.getByRole("button", { name: WIDE_FIXTURE_BUTTON })).toHaveCount(0);
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

async function uploadGeneratedImage(page: Page, width: number, height: number, transparent = false) {
  await expect(page.locator('input[type="file"]')).toBeAttached();
  await page.evaluate(
    async ({ imageHeight, imageWidth, isTransparent }) => {
      const canvas = document.createElement("canvas");
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("Could not prepare the import fixture.");
      }
      context.fillStyle = isTransparent ? "#ff0000" : "#8cad99";
      context.fillRect(0, 0, isTransparent ? 1 : imageWidth, imageHeight);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Could not encode the fixture."))));
      });
      const file = new File([blob], isTransparent ? "transparent-fixture.png" : "wide-fixture.png", {
        type: "image/png",
      });
      const transfer = new DataTransfer();
      transfer.items.add(file);
      const input = document.querySelector<HTMLInputElement>('input[type="file"]');
      if (!input) {
        throw new Error("The image import input was not found.");
      }
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    },
    { imageHeight: height, imageWidth: width, isTransparent: transparent }
  );
}

async function uploadColorBands(page: Page) {
  await expect(page.locator('input[type="file"]')).toBeAttached();
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 2;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare the crop fixture.");
    }

    for (const [index, color] of ["#ff0000", "#00ff00", "#0000ff", "#ffff00"].entries()) {
      context.fillStyle = color;
      context.fillRect(index, 0, 1, 2);
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => (result ? resolve(result) : reject(new Error("Could not encode the crop fixture."))));
    });
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], "color-bands.png", { type: "image/png" }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) {
      throw new Error("The image import input was not found.");
    }
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function uploadHiddenCropColors(page: Page) {
  await expect(page.locator('input[type="file"]')).toBeAttached();
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not prepare the hidden-color crop fixture.");
    }

    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const colors = ["#00ff00", "#0000ff", "#ff0000", "#ffff00"];
    for (let x = 384; x < 640; x += 1) {
      context.fillStyle = colors[x % colors.length];
      context.fillRect(x, 384, 1, 256);
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) =>
        result ? resolve(result) : reject(new Error("Could not encode the hidden-color crop fixture."))
      );
    });
    const transfer = new DataTransfer();
    transfer.items.add(new File([blob], "hidden-crop-colors.png", { type: "image/png" }));
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) {
      throw new Error("The image import input was not found.");
    }
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

function readPreviewEdgeColors(preview: ReturnType<Page["locator"]>) {
  return preview.evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Could not read the import preview.");
    }

    return {
      left: Array.from(context.getImageData(0, 0, 1, 1).data),
      right: Array.from(context.getImageData(canvas.width - 1, 0, 1, 1).data),
    };
  });
}
