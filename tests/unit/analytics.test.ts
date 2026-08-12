import { describe, expect, it } from "vitest";
import { getArtworkAnalyticsProperties } from "../../src/analytics/posthog";
import type { PuzzleDefinition } from "../../src/coloring/types";

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
