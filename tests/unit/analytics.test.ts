import { afterEach, describe, expect, it, vi } from "vitest";
import { getArtworkAnalyticsProperties } from "../../src/analytics/posthog";
import type { PuzzleDefinition } from "../../src/coloring/types";

const posthogMocks = vi.hoisted(() => ({ capture: vi.fn(), init: vi.fn() }));
vi.mock("posthog-js/dist/module.no-external", () => ({ default: posthogMocks }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const puzzle: PuzzleDefinition = {
  height: 4,
  id: "custom-secret-name-mabc",
  name: "A private filename",
  palette: ["#000000", "#ffffff"],
  targetPixels: new Uint8Array(16),
  width: 4,
};

describe("analytics artwork properties", () => {
  it("includes authored catalog identity", () => {
    expect(getArtworkAnalyticsProperties({ ...puzzle, id: "gobbo" }, "catalog")).toEqual({
      artwork_id: "gobbo",
      artwork_source: "catalog",
      cell_count: 16,
      grid_height: 4,
      grid_width: 4,
      palette_size: 2,
    });
  });

  it("does not include imported names or IDs", () => {
    const properties = getArtworkAnalyticsProperties(puzzle, "imported");

    expect(properties).toEqual({
      artwork_source: "imported",
      cell_count: 16,
      grid_height: 4,
      grid_width: 4,
      palette_size: 2,
    });
    expect(JSON.stringify(properties)).not.toContain("private");
    expect(JSON.stringify(properties)).not.toContain("custom-secret");
  });
});

describe("achievement events", () => {
  it("captures only the authored achievement ID", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_POSTHOG_PROJECT_TOKEN", "test-token");
    vi.stubEnv("VITE_POSTHOG_HOST", "https://analytics.example.test");
    vi.resetModules();
    const analytics = await import("../../src/analytics/posthog");
    analytics.trackAchievementUnlocked("first-import");
    await vi.waitFor(() => expect(posthogMocks.capture).toHaveBeenCalledTimes(1));
    expect(posthogMocks.capture.mock.calls).toEqual([["achievement_unlocked", { achievement_id: "first-import" }]]);
  });

  it("keeps achievement tracking disabled in development", async () => {
    vi.stubEnv("PROD", false);
    vi.resetModules();
    const analytics = await import("../../src/analytics/posthog");
    analytics.trackAchievementUnlocked("first-import");
    await Promise.resolve();
    expect(posthogMocks.capture).not.toHaveBeenCalled();
  });
});

describe("progress milestone events", () => {
  it("captures each quarter milestone once as painting crosses it", async () => {
    vi.stubEnv("PROD", true);
    vi.stubEnv("VITE_POSTHOG_PROJECT_TOKEN", "test-token");
    vi.stubEnv("VITE_POSTHOG_HOST", "https://analytics.example.test");
    vi.resetModules();
    const analytics = await import("../../src/analytics/posthog");
    const milestoneUpdate = { puzzle, source: "imported", totalCells: 16 } as const;

    analytics.trackProgressMilestones({ ...milestoneUpdate, paintedCells: 3, previousPaintedCells: 0 });
    analytics.trackProgressMilestones({ ...milestoneUpdate, paintedCells: 4, previousPaintedCells: 3 });
    analytics.trackProgressMilestones({ ...milestoneUpdate, paintedCells: 5, previousPaintedCells: 4 });
    analytics.trackProgressMilestones({ ...milestoneUpdate, paintedCells: 16, previousPaintedCells: 5 });
    await vi.waitFor(() => expect(posthogMocks.capture).toHaveBeenCalledTimes(3));

    const { calls } = posthogMocks.capture.mock;
    expect(calls.map(([event, properties]) => [event, properties.milestone_percent])).toEqual([
      ["puzzle_milestone_reached", 25],
      ["puzzle_milestone_reached", 50],
      ["puzzle_milestone_reached", 75],
    ]);
    expect(JSON.stringify(calls)).not.toContain("custom-secret");
  });
});
