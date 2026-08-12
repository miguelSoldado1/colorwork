import { describe, expect, it } from "vitest";
import {
  constrainArtworkName,
  isArtworkNameWithinLimit,
  MAX_ARTWORK_NAME_LENGTH,
  normalizeArtworkName,
} from "@/levels/artwork-name";

describe("artwork names", () => {
  it("trims names and falls back for empty values", () => {
    expect(normalizeArtworkName("  Evening tiles  ")).toBe("Evening tiles");
    expect(normalizeArtworkName("   ")).toBe("Custom puzzle");
  });

  it("constrains new names without weakening validation for renames", () => {
    const overlong = "x".repeat(MAX_ARTWORK_NAME_LENGTH + 20);

    expect(constrainArtworkName(overlong)).toBe("x".repeat(MAX_ARTWORK_NAME_LENGTH));
    expect(isArtworkNameWithinLimit(overlong)).toBe(false);
    expect(isArtworkNameWithinLimit(constrainArtworkName(overlong))).toBe(true);
  });
});
