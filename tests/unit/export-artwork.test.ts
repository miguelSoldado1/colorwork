import { describe, expect, it } from "vitest";
import { createArtworkExportSize } from "../../src/coloring/export-artwork";

describe("createArtworkExportSize", () => {
  it("scales small artwork to a useful long side with whole pixels", () => {
    expect(createArtworkExportSize({ height: 4, width: 4 })).toEqual({
      height: 1024,
      scale: 256,
      width: 1024,
    });
    expect(createArtworkExportSize({ height: 128, width: 512 })).toEqual({
      height: 256,
      scale: 2,
      width: 1024,
    });
  });

  it("does not reduce artwork larger than the export target", () => {
    expect(createArtworkExportSize({ height: 600, width: 1200 })).toEqual({
      height: 600,
      scale: 1,
      width: 1200,
    });
  });
});
