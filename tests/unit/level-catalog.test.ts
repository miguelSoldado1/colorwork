import { describe, expect, it } from "vitest";
import { createCompletedPuzzleProgress, createPuzzleProgress } from "@/coloring/progress";
import { describeLevel } from "@/levels/describe-level";
import { findLevel, LEVELS } from "@/levels/level-catalog";
import type { PuzzleDefinition } from "@/coloring/types";

function puzzleOf(width: number, targetPixels: number[]): PuzzleDefinition {
  const paletteSize = Math.max(...targetPixels) + 1;

  return {
    height: targetPixels.length / width,
    id: "test-puzzle",
    name: "Test puzzle",
    palette: Array.from({ length: paletteSize }, (_, index) => `#00000${index}`),
    targetPixels: new Uint8Array(targetPixels),
    width,
  };
}

describe("level catalog", () => {
  it("holds artwork with unique ids and square pixel data", () => {
    const ids = LEVELS.map((puzzle) => puzzle.id);

    expect(LEVELS.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const puzzle of LEVELS) {
      if (puzzle.artist) {
        expect(puzzle.artist.name.trim()).toBeTruthy();
      }
      expect(puzzle.targetPixels).toHaveLength(puzzle.width * puzzle.height);
      expect(puzzle.palette.length).toBeGreaterThan(0);
    }
  });

  it("keeps artwork in catalog order", () => {
    for (let index = 1; index < LEVELS.length; index += 1) {
      expect(LEVELS[index].catalogOrder).toBeGreaterThanOrEqual(LEVELS[index - 1].catalogOrder ?? 0);
    }
  });

  it("presents the built-in artwork from easiest to hardest", () => {
    expect(LEVELS.map((puzzle) => puzzle.name)).toEqual([
      "Gobbo",
      "Vending Machine",
      "Ribbit",
      "Warehouse",
      "Mech",
      "Deep Sea",
      "Sky Farm",
      "Jungle",
      "Mountain",
    ]);
  });

  it("finds a level by id and reports nothing for an unknown one", () => {
    expect(findLevel(LEVELS[0].id)?.name).toBe(LEVELS[0].name);
    expect(findLevel("not-an-artwork")).toBeUndefined();
  });

  it("keeps every target color inside the artwork palette", () => {
    for (const puzzle of LEVELS) {
      for (const colorIndex of puzzle.targetPixels) {
        expect(colorIndex).toBeLessThan(puzzle.palette.length);
      }
    }
  });
});

describe("describeLevel", () => {
  it("reads as untouched when no progress is supplied", () => {
    const puzzle = puzzleOf(2, [0, 1, 2, 3]);
    const description = describeLevel(puzzle, undefined, "catalog");

    expect(description.paintedCount).toBe(0);
    expect(description.percent).toBe(0);
    expect(description.completedColors).toBe(0);
    expect(description.started).toBe(false);
    expect(description.finished).toBe(false);
  });

  it("carries the artwork's own totals so the menu can size and count it", () => {
    const description = describeLevel(puzzleOf(4, [0, 1, 1, 1, 0, 1, 1, 1]), undefined, "catalog");

    expect(description.totalPixels).toBe(8);
    expect(description.puzzle.width).toBe(4);
    expect(description.puzzle.height).toBe(2);
  });

  it("separates catalog artwork from imports so the menu can group them", () => {
    const puzzle = puzzleOf(2, [0, 1, 2, 3]);

    expect(describeLevel(puzzle, undefined, "catalog").source).toBe("catalog");
    expect(describeLevel(puzzle, undefined, "imported").source).toBe("imported");
  });

  it("reports one finished flag per palette color", () => {
    const description = describeLevel(puzzleOf(2, [0, 1, 2, 3]), undefined, "catalog");

    expect(description.finishedColors).toEqual([false, false, false, false]);
    expect(description.finishedColors).toHaveLength(description.puzzle.palette.length);
  });

  it("describes partial progress using counts and completed colors", () => {
    const puzzle = puzzleOf(2, [0, 1, 0, 1]);
    const progress = createPuzzleProgress(puzzle);
    progress.paintedPixels[0] = 0;
    progress.paintedPixels[1] = 1;
    progress.paintedPixels[3] = 1;
    progress.paintedByColor[0] = 1;
    progress.paintedByColor[1] = 2;
    progress.paintedCount = 3;

    expect(describeLevel(puzzle, progress, "catalog")).toMatchObject({
      completedColors: 1,
      finished: false,
      finishedColors: [false, true],
      paintedCount: 3,
      percent: 75,
      started: true,
    });
  });

  it("describes completed progress without relying on rounded percent", () => {
    const puzzle = puzzleOf(2, [0, 1, 0, 1]);

    expect(describeLevel(puzzle, createCompletedPuzzleProgress(puzzle), "catalog")).toMatchObject({
      completedColors: 2,
      finished: true,
      finishedColors: [true, true],
      paintedCount: 4,
      percent: 100,
      started: true,
    });
  });

  it("describes an untouched catalogued artwork as all zeros", () => {
    const [puzzle] = LEVELS;

    expect(describeLevel(puzzle, undefined, "catalog")).toMatchObject({
      completedColors: 0,
      finished: false,
      paintedCount: 0,
      percent: 0,
      started: false,
      totalPixels: puzzle.width * puzzle.height,
    });
  });
});
