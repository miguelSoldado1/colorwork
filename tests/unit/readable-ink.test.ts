import { describe, expect, it } from "vitest";
import { contrastRatio, DARK_INK, LIGHT_INK, readableInk, relativeLuminance } from "../../src/coloring/readable-ink";
import mechPuzzle from "../../src/puzzles/mech";

const LARGE_TEXT_MINIMUM = 3;

function inkContrast(swatchHex: string) {
  return contrastRatio(relativeLuminance(swatchHex), relativeLuminance(readableInk(swatchHex)));
}

describe("readableInk", () => {
  it.each([
    { expected: LIGHT_INK, name: "near-black", swatch: "#000000" },
    { expected: DARK_INK, name: "near-white", swatch: "#ffffff" },
    { expected: LIGHT_INK, name: "deep teal", swatch: "#215059" },
    { expected: DARK_INK, name: "pale sand", swatch: "#c6be9b" },
    // Mid tones are where a fixed luminance threshold picks the wrong ink.
    { expected: DARK_INK, name: "mid orange", swatch: "#bf7443" },
    { expected: DARK_INK, name: "desaturated sage", swatch: "#8a8c7d" },
    { expected: DARK_INK, name: "muted green", swatch: "#4f8d76" },
  ])("picks the higher-contrast ink for $name", ({ expected, swatch }) => {
    expect(readableInk(swatch)).toBe(expected);
  });

  it("never picks the lower-contrast ink", () => {
    for (const swatch of mechPuzzle.palette) {
      const chosen = contrastRatio(relativeLuminance(swatch), relativeLuminance(readableInk(swatch)));
      const rejected = contrastRatio(
        relativeLuminance(swatch),
        relativeLuminance(readableInk(swatch) === DARK_INK ? LIGHT_INK : DARK_INK)
      );

      expect(chosen).toBeGreaterThanOrEqual(rejected);
    }
  });

  it("clears the large-text contrast floor across the shipped palette", () => {
    for (const swatch of mechPuzzle.palette) {
      expect(inkContrast(swatch)).toBeGreaterThanOrEqual(LARGE_TEXT_MINIMUM);
    }
  });

  it("stays above the floor across the hue circle at mid lightness", () => {
    // Mid-lightness colors are the worst case; imported artwork can land anywhere on the wheel.
    for (let hue = 0; hue < 360; hue += 15) {
      expect(inkContrast(hslToHex(hue, 0.65, 0.5))).toBeGreaterThanOrEqual(LARGE_TEXT_MINIMUM);
    }
  });
});

describe("contrastRatio", () => {
  it("is symmetric and bounded by black on white", () => {
    const black = relativeLuminance("#000000");
    const white = relativeLuminance("#ffffff");

    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, white)).toBeCloseTo(1, 5);
  });
});

function hslToHex(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const secondary = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = lightness - chroma / 2;
  const sector = Math.floor(hue / 60) % 6;
  const [red, green, blue] = [
    [chroma, secondary, 0],
    [secondary, chroma, 0],
    [0, chroma, secondary],
    [0, secondary, chroma],
    [secondary, 0, chroma],
    [chroma, 0, secondary],
  ][sector];

  return `#${[red, green, blue]
    .map((channel) =>
      Math.round((channel + match) * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}
