import { afterEach, describe, expect, it, vi } from "vitest";
import { createNumberGlyphAtlas, numberGlyphScale } from "../../src/coloring/number-glyphs";

interface PaintedPixel {
  color: string;
  x: number;
  y: number;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createNumberGlyphAtlas", () => {
  it("packs labels 1 through 255 without overlapping their atlas regions", () => {
    const { canvas, sprites } = createAtlas(255);

    expect(canvas).toMatchObject({ height: 13, width: 2629 });
    expect(sprites).toHaveLength(255);
    expect(sprites[0]).toEqual({ height: 5, selectedY: 7, unselectedY: 1, width: 3, x: 1 });
    expect(sprites[9]).toEqual({ height: 5, selectedY: 7, unselectedY: 1, width: 7, x: 37 });
    expect(sprites[99]).toEqual({ height: 5, selectedY: 7, unselectedY: 1, width: 11, x: 757 });

    for (let index = 1; index < sprites.length; index += 1) {
      const previous = sprites[index - 1];
      expect(sprites[index].x).toBe(previous.x + previous.width + 1);
    }
  });

  it("renders representative digits and composes multi-digit labels with a one-pixel gap", () => {
    const { pixels, sprites } = createAtlas(10);

    expect(readSprite(pixels, sprites[0], "unselected")).toEqual(["010", "110", "010", "010", "111"]);
    expect(readSprite(pixels, sprites[3], "unselected")).toEqual(["101", "101", "111", "001", "001"]);
    expect(readSprite(pixels, sprites[6], "unselected")).toEqual(["111", "001", "001", "001", "001"]);
    expect(readSprite(pixels, sprites[9], "unselected")).toEqual([
      "0100111",
      "1100101",
      "0100101",
      "0100101",
      "1110111",
    ]);
  });

  it("draws identical glyphs in separate selected and unselected semantic colors", () => {
    const { pixels, sprites } = createAtlas(1);
    const [sprite] = sprites;

    expect(readSprite(pixels, sprite, "selected")).toEqual(readSprite(pixels, sprite, "unselected"));
    expect(new Set(pixels.map(({ color }) => color))).toEqual(new Set(["selected", "unselected"]));
  });
});

describe("numberGlyphScale", () => {
  it.each([
    { cellSize: 2.1, expected: 1, name: "a 256 wide import squeezed onto the screen" },
    { cellSize: 8.49, expected: 1, name: "a 64x64 board fitted to the screen" },
    { cellSize: 14, expected: 1, name: "the smallest cell that fits a two-digit label exactly" },
    { cellSize: 28, expected: 2, name: "twice that" },
    { cellSize: 42, expected: 3, name: "three times that" },
  ])("scales two-digit labels to $expected on $name", ({ cellSize, expected }) => {
    expect(numberGlyphScale(cellSize, 7, 5)).toBe(expected);
  });

  it("is bound by whichever of the glyph's width and height runs out first", () => {
    expect(numberGlyphScale(40, 3, 5)).toBe(3);
    expect(numberGlyphScale(40, 7, 5)).toBe(2);
  });

  it("never returns a fractional or zero scale, which would drop glyph rows", () => {
    for (let cellSize = 0.5; cellSize < 80; cellSize += 0.25) {
      const scale = numberGlyphScale(cellSize, 7, 5);

      expect(Number.isInteger(scale)).toBe(true);
      expect(scale).toBeGreaterThanOrEqual(1);
    }
  });
});

function createAtlas(labelCount: number) {
  const pixels: PaintedPixel[] = [];
  const context = {
    fillRect(x: number, y: number) {
      pixels.push({ color: this.fillStyle, x, y });
    },
    fillStyle: "",
    imageSmoothingEnabled: true,
  };
  const canvas = {
    getContext: () => context,
    height: 0,
    width: 0,
  };
  vi.stubGlobal("document", {
    createElement: () => canvas,
  });

  return {
    ...createNumberGlyphAtlas(labelCount, { selected: "selected", unselected: "unselected" }),
    pixels,
  };
}

function readSprite(
  pixels: PaintedPixel[],
  sprite: ReturnType<typeof createNumberGlyphAtlas>["sprites"][number],
  color: string
) {
  const sourceY = color === "selected" ? sprite.selectedY : sprite.unselectedY;
  const paintedCoordinates = new Set(
    pixels.filter((pixel) => pixel.color === color).map((pixel) => `${pixel.x - sprite.x},${pixel.y - sourceY}`)
  );

  return Array.from({ length: sprite.height }, (_unusedRow, rowIndex) =>
    Array.from({ length: sprite.width }, (_unusedColumn, columnIndex) =>
      paintedCoordinates.has(`${columnIndex},${rowIndex}`) ? "1" : "0"
    ).join("")
  );
}
