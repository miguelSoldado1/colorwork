import { describe, expect, it } from "vitest";
import {
  countPixelColors,
  createIndexedPixelData,
  getImportName,
  getMaximumImportGridSide,
  getRecommendedGridSize,
  MAX_IMPORT_CELL_COUNT,
  MAX_IMPORT_GRID_SIDE,
} from "../../src/coloring/import-image";

const HEX_COLOR_PATTERN = /^#[\da-f]{6}$/;
const SKEWED_COLORS: ColorCount[] = [
  ["#215059", 2064],
  ["#c1a878", 549],
  ["#c6be9b", 542],
  ["#bf7443", 177],
  ["#c28a40", 148],
  ["#949a84", 108],
  ["#482f36", 90],
  ["#af4e3d", 86],
  ["#b95c33", 82],
  ["#8a8c7d", 70],
  ["#2e6b60", 64],
  ["#c69a54", 50],
  ["#aca68e", 34],
  ["#a3433a", 24],
  ["#4f8d76", 8],
];

type ColorCount = [color: string, count: number];

describe("getRecommendedGridSize", () => {
  it("preserves images already inside the grid limit", () => {
    expect(getRecommendedGridSize(64, 32)).toEqual({ height: 32, width: 64 });
  });

  it("uses the full cell budget while preserving the source aspect ratio", () => {
    expect(getRecommendedGridSize(1000, 250)).toEqual({ height: 128, width: 512 });
    expect(getRecommendedGridSize(1000, 500)).toEqual({ height: 181, width: 362 });
    expect(getRecommendedGridSize(1000, 1000)).toEqual({ height: 256, width: 256 });
  });

  it("keeps every recommendation inside both import limits", () => {
    for (const [width, height] of [
      [512, 256],
      [100, 400],
      [1000, 1000],
      [1000, 100],
    ]) {
      const size = getRecommendedGridSize(width, height);

      expect(size.width).toBeLessThanOrEqual(MAX_IMPORT_GRID_SIDE);
      expect(size.height).toBeLessThanOrEqual(MAX_IMPORT_GRID_SIDE);
      expect(size.width * size.height).toBeLessThanOrEqual(MAX_IMPORT_CELL_COUNT);
      expect(size.width / size.height).toBeCloseTo(width / height, 1);
    }
  });

  it("keeps both dimensions usable for extremely wide or tall images", () => {
    expect(getRecommendedGridSize(10_000, 1)).toEqual({ height: 1, width: 512 });
    expect(getRecommendedGridSize(1, 10_000)).toEqual({ height: 512, width: 1 });
  });
});

describe("getMaximumImportGridSide", () => {
  it("spends the remaining cell budget on an independently edited side", () => {
    expect(getMaximumImportGridSide(128)).toBe(512);
    expect(getMaximumImportGridSide(256)).toBe(256);
    expect(getMaximumImportGridSide(512)).toBe(128);
  });
});

describe("getImportName", () => {
  it("turns a file name into a readable puzzle name", () => {
    expect(getImportName("napoleon-dynamite_279099.png")).toBe("Napoleon Dynamite 279099");
  });

  it("falls back when the file name has no usable stem", () => {
    expect(getImportName(".png")).toBe("Custom puzzle");
  });
});

describe("countPixelColors", () => {
  it("counts unique RGB values using the same rules as palette generation", () => {
    const pixels = new Uint8ClampedArray([12, 34, 56, 0, 12, 34, 56, 128, 12, 34, 56, 255, 78, 90, 12, 255]);

    expect(countPixelColors(pixels)).toBe(2);
    expect(createIndexedPixelData(pixels, 10).palette).toHaveLength(2);
  });
});

describe("createIndexedPixelData", () => {
  it("preserves exact colors, orders them by use, and maps pixels in row-major order", () => {
    const pixels = createPixelData([
      ["#ff0000", 1],
      ["#0000ff", 1],
      ["#ff0000", 1],
      ["#ff0000", 1],
    ]);

    const result = createIndexedPixelData(pixels, 2);

    expect(result.palette).toEqual(["#ff0000", "#0000ff"]);
    expect(result.targetPixels).toEqual(new Uint8Array([0, 1, 0, 0]));
  });

  it("reduces colors to the requested palette size", () => {
    const pixels = createPixelData([
      ["#ff0000", 1],
      ["#0000ff", 1],
    ]);

    const result = createIndexedPixelData(pixels, 1);

    expect(result.palette).toEqual(["#800080"]);
    expect(result.targetPixels).toEqual(new Uint8Array([0, 0]));
  });

  it("honors every palette size for the skewed real-world regression histogram", () => {
    for (let paletteSize = 1; paletteSize <= SKEWED_COLORS.length; paletteSize += 1) {
      expectColorContract(SKEWED_COLORS, paletteSize);
    }
  });

  it("does not invent colors when the requested palette is larger than the source palette", () => {
    expectColorContract(
      [
        ["#000000", 4],
        ["#ffffff", 4],
      ],
      32
    );
  });

  it("handles a single-color image without quantization", () => {
    expectColorContract([["#123456", 20]], 1);
    expectColorContract([["#123456", 20]], 32);
  });

  it("maintains palette and target-index invariants across generated color distributions", () => {
    for (const colorCount of [2, 3, 4, 7, 15, 32]) {
      for (const seed of [17, 977, 65_537, 1_048_583]) {
        const colors = createGeneratedColors(colorCount, colorCount * seed);
        const paletteSizes = new Set([
          1,
          Math.ceil(colorCount / 3),
          Math.ceil(colorCount / 2),
          colorCount - 1,
          colorCount,
        ]);

        for (const paletteSize of paletteSizes) {
          expectColorContract(colors, paletteSize);
        }
      }
    }
  });

  it.each([0, -1, 1.5, 256])("rejects invalid palette size %s", (paletteSize) => {
    expect(() => createIndexedPixelData(createPixelData([["#123456", 1]]), paletteSize)).toThrow(RangeError);
  });

  it("rejects empty or incomplete RGBA pixel buffers", () => {
    expect(() => createIndexedPixelData(new Uint8ClampedArray(), 1)).toThrow(RangeError);
    expect(() => createIndexedPixelData(new Uint8ClampedArray([0, 0, 0]), 1)).toThrow(RangeError);
    expect(() => countPixelColors(new Uint8ClampedArray())).toThrow(RangeError);
  });
});

function expectColorContract(colors: ColorCount[], requestedPaletteSize: number) {
  const pixels = createPixelData(colors);
  const result = createIndexedPixelData(pixels, requestedPaletteSize);
  const expectedPaletteSize = Math.min(colors.length, requestedPaletteSize);

  expect(countPixelColors(pixels)).toBe(colors.length);
  expect(result.palette).toHaveLength(expectedPaletteSize);
  expect(new Set(result.palette)).toHaveLength(expectedPaletteSize);
  expect(result.palette.every((color) => HEX_COLOR_PATTERN.test(color))).toBe(true);
  expect(result.targetPixels).toHaveLength(pixels.length / 4);
  expect(result.targetPixels.every((colorIndex) => colorIndex < expectedPaletteSize)).toBe(true);
  expect(new Set(result.targetPixels)).toHaveLength(expectedPaletteSize);
}

function createGeneratedColors(colorCount: number, seed: number) {
  const colors: ColorCount[] = [];
  const usedColors = new Set<string>();
  let state = seed;

  while (colors.length < colorCount) {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    const color = `#${(state % 16_777_216).toString(16).padStart(6, "0")}`;
    if (!usedColors.has(color)) {
      usedColors.add(color);
      colors.push([color, (state % 23) + 1]);
    }
  }

  return colors;
}

function createPixelData(colors: ColorCount[]) {
  const pixelCount = colors.reduce((total, [, count]) => total + count, 0);
  const data = new Uint8ClampedArray(pixelCount * 4);
  let dataIndex = 0;

  for (const [color, count] of colors) {
    const red = Number.parseInt(color.slice(1, 3), 16);
    const green = Number.parseInt(color.slice(3, 5), 16);
    const blue = Number.parseInt(color.slice(5, 7), 16);

    for (let pixelIndex = 0; pixelIndex < count; pixelIndex += 1) {
      data[dataIndex] = red;
      data[dataIndex + 1] = green;
      data[dataIndex + 2] = blue;
      data[dataIndex + 3] = 255;
      dataIndex += 4;
    }
  }

  return data;
}
