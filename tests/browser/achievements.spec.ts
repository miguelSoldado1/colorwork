import { expect, test } from "@playwright/test";

for (const width of [390, 1280]) {
  test(`keeps achievement geometry stable while history loads at ${width}px`, async ({ context, page }) => {
    // Keep a v1 connection open to hold the app's schema upgrade while measuring loading UI.
    const blocker = await context.newPage();
    await blocker.route("**/achievement-test-blocker", (route) =>
      route.fulfill({ body: "<!doctype html>", contentType: "text/html" })
    );
    await blocker.goto("/achievement-test-blocker");
    await blocker.evaluate(async () => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("colorwork", 1);
        request.onupgradeneeded = () => {
          const store = request.result.createObjectStore("achievementUnlocks", { keyPath: "achievementId" });
          store.put({ achievementId: "personal-collection", unlockedAt: 1234, version: 1 });
        };
        request.onsuccess = () => {
          Object.assign(window, { achievementTestDatabase: request.result });
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    });
    await page.setViewportSize({ height: 1000, width });
    await page.goto("/achievements");
    const skeleton = page.locator('ol[data-loading="true"]');
    await expect(skeleton).toBeVisible();
    await expect(page.getByRole("heading", { exact: true, name: "First finish" })).toBeVisible();
    await expect(
      page.getByText("Finish your first artwork. The first one always feels good.", { exact: true })
    ).toBeVisible();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    const before = await skeleton
      .locator(":scope > li")
      .evaluateAll((cards) =>
        cards.map((card) => ({ height: card.getBoundingClientRect().height, y: card.getBoundingClientRect().y }))
      );
    await blocker.close();
    await expect(page.getByRole("heading", { name: "1 of 8 unlocked" })).toBeVisible();
    const after = await page
      .getByRole("list")
      .getByRole("listitem")
      .evaluateAll((cards) =>
        cards.map((card) => ({ height: card.getBoundingClientRect().height, y: card.getBoundingClientRect().y }))
      );
    expect(after).toEqual(before);
    await expect(page.getByText("1 more artwork", { exact: true })).toHaveCount(2);
    await expect(page.getByText("5 more artworks", { exact: true })).toBeVisible();
    await expect(page.getByText("20 / 20", { exact: true })).toBeVisible();
    // An earned collection award stays full even when its original imports no longer exist.
    await expect(page.getByRole("progressbar", { name: "Personal collection progress" })).toHaveAttribute(
      "aria-valuenow",
      "20"
    );
    await expect(page.getByRole("progressbar", { name: "First finish progress" })).toHaveAttribute(
      "aria-valuenow",
      "0"
    );
  });
}

test("opens a linked achievement and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ height: 700, width: 390 });
  await page.goto("/achievements#achievement-personal-collection");
  const card = page.locator("#achievement-personal-collection");
  await expect(card).toBeFocused();
  await expect(card).toBeInViewport();
  await expect(card).toHaveCSS("animation-timing-function", "steps(1)");
  await expect(card.getByText("20 more imports", { exact: true })).toBeVisible();
});
