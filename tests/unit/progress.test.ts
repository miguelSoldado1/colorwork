import { describe, expect, it } from "vitest";
import {
  clonePuzzleProgress,
  countTargetPixelsByColor,
  createCompletedPuzzleProgress,
  createProgressSummary,
  createPuzzleProgress,
  UNPAINTED_PIXEL,
} from "../../src/coloring/progress";
import type { PuzzleDefinition } from "../../src/coloring/types";

const smallPuzzle = {
  height: 2,
  id: "small-puzzle",
  name: "Small puzzle",
  palette: ["#111111", "#777777", "#eeeeee"],
  targetPixels: new Uint8Array([0, 1, 1, 2, 0, 1]),
  width: 3,
} satisfies PuzzleDefinition;

describe("createPuzzleProgress", () => {
  it("creates unpainted progress matching the puzzle dimensions and palette", () => {
    const progress = createPuzzleProgress(smallPuzzle);

    expect(progress.paintedCount).toBe(0);
    expect(progress.paintedByColor).toEqual(new Uint32Array([0, 0, 0]));
    expect(progress.paintedPixels).toEqual(
      new Uint8Array([
        UNPAINTED_PIXEL,
        UNPAINTED_PIXEL,
        UNPAINTED_PIXEL,
        UNPAINTED_PIXEL,
        UNPAINTED_PIXEL,
        UNPAINTED_PIXEL,
      ])
    );
  });

  it("creates independent mutable buffers for each player session", () => {
    const firstProgress = createPuzzleProgress(smallPuzzle);
    const secondProgress = createPuzzleProgress(smallPuzzle);

    firstProgress.paintedPixels[0] = 0;
    firstProgress.paintedByColor[0] = 1;

    expect(secondProgress.paintedPixels[0]).toBe(UNPAINTED_PIXEL);
    expect(secondProgress.paintedByColor[0]).toBe(0);
  });
});

describe("createCompletedPuzzleProgress", () => {
  it("creates completed progress without sharing the immutable target buffer", () => {
    const progress = createCompletedPuzzleProgress(smallPuzzle);

    expect(progress.paintedCount).toBe(6);
    expect(progress.paintedByColor).toEqual(new Uint32Array([2, 3, 1]));
    expect(progress.paintedPixels).toEqual(smallPuzzle.targetPixels);
    expect(progress.paintedPixels).not.toBe(smallPuzzle.targetPixels);
  });
});

describe("clonePuzzleProgress", () => {
  it("preserves progress in independent mutable buffers", () => {
    const progress = createPuzzleProgress(smallPuzzle);
    progress.paintedPixels[1] = 1;
    progress.paintedByColor[1] = 1;
    progress.paintedCount = 1;

    const clone = clonePuzzleProgress(progress);
    progress.paintedPixels[1] = UNPAINTED_PIXEL;
    progress.paintedByColor[1] = 0;

    expect(clone).toEqual({
      paintedByColor: new Uint32Array([0, 1, 0]),
      paintedCount: 1,
      paintedPixels: new Uint8Array([
        UNPAINTED_PIXEL,
        1,
        UNPAINTED_PIXEL,
        UNPAINTED_PIXEL,
        UNPAINTED_PIXEL,
        UNPAINTED_PIXEL,
      ]),
    });
  });
});

describe("countTargetPixelsByColor", () => {
  it("counts target pixels by their palette index", () => {
    expect(countTargetPixelsByColor(smallPuzzle)).toEqual(new Uint32Array([2, 3, 1]));
  });

  it("retains zero totals for palette colors that are not used", () => {
    const puzzleWithUnusedColors = {
      ...smallPuzzle,
      palette: ["#111111", "#777777", "#eeeeee", "#ffffff"],
    };

    expect(countTargetPixelsByColor(puzzleWithUnusedColors)).toEqual(new Uint32Array([2, 3, 1, 0]));
  });
});

describe("createProgressSummary", () => {
  it("returns the current progress as small serializable arrays", () => {
    const progress = createPuzzleProgress(smallPuzzle);
    progress.paintedByColor[1] = 2;
    progress.paintedCount = 2;

    expect(createProgressSummary(smallPuzzle, progress)).toEqual({
      paintedByColor: [0, 2, 0],
      paintedCount: 2,
      totalByColor: [2, 3, 1],
      totalPixels: 6,
    });
  });

  it("copies mutable progress instead of exposing its typed arrays", () => {
    const progress = createPuzzleProgress(smallPuzzle);
    const summary = createProgressSummary(smallPuzzle, progress);

    progress.paintedByColor[0] = 1;

    expect(summary.paintedByColor).toEqual([0, 0, 0]);
  });

  it("uses and copies a precomputed target total when one is supplied", () => {
    const progress = createPuzzleProgress(smallPuzzle);
    const totals = new Uint32Array([20, 30, 10]);
    const summary = createProgressSummary(smallPuzzle, progress, totals);

    totals[0] = 999;

    expect(summary.totalByColor).toEqual([20, 30, 10]);
  });
});
