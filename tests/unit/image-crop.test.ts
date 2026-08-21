import { describe, expect, it } from "vitest";
import {
  constrainImageCrop,
  DEFAULT_IMAGE_CROP,
  fitCropFrame,
  getImageCropRect,
  moveImageCrop,
} from "../../src/coloring/image-crop";

describe("image crop geometry", () => {
  it("centers the largest crop matching the output ratio", () => {
    expect(getImageCropRect(DEFAULT_IMAGE_CROP, { height: 500, width: 1000 }, { height: 100, width: 100 })).toEqual({
      height: 500,
      width: 500,
      x: 250,
      y: 0,
    });
    expect(getImageCropRect(DEFAULT_IMAGE_CROP, { height: 1000, width: 500 }, { height: 100, width: 100 })).toEqual({
      height: 500,
      width: 500,
      x: 0,
      y: 250,
    });
  });

  it("zooms toward the selected center", () => {
    expect(
      getImageCropRect(
        { centerX: 0.75, centerY: 0.5, zoom: 2 },
        { height: 500, width: 1000 },
        { height: 100, width: 100 }
      )
    ).toEqual({ height: 250, width: 250, x: 625, y: 125 });
  });

  it("clamps zoom and position inside the source image", () => {
    expect(
      constrainImageCrop(
        { centerX: 2, centerY: -1, zoom: 10 },
        { height: 500, width: 1000 },
        { height: 100, width: 100 }
      )
    ).toEqual({ centerX: 0.9375, centerY: 0.125, zoom: 4 });
  });

  it("moves by fractions of the current selected area", () => {
    expect(
      moveImageCrop(
        { centerX: 0.5, centerY: 0.5, zoom: 2 },
        { x: 0.5, y: -0.25 },
        { height: 500, width: 1000 },
        { height: 100, width: 100 }
      )
    ).toEqual({ centerX: 0.625, centerY: 0.375, zoom: 2 });
  });

  it("fits wide and tall output frames without changing their ratio", () => {
    expect(fitCropFrame({ height: 100, width: 200 }, { height: 300, width: 300 })).toEqual({
      height: 150,
      width: 300,
    });
    expect(fitCropFrame({ height: 200, width: 100 }, { height: 300, width: 300 })).toEqual({
      height: 300,
      width: 150,
    });
  });
});
