import type { PuzzleDefinition, PuzzleProgress } from "./types";

export const UNPAINTED_PIXEL = 255;

export function createPuzzleProgress(puzzle: PuzzleDefinition) {
  const paintedPixels = new Uint8Array(puzzle.width * puzzle.height);
  paintedPixels.fill(UNPAINTED_PIXEL);

  return {
    paintedByColor: new Uint32Array(puzzle.palette.length),
    paintedCount: 0,
    paintedPixels,
  };
}

export function countTargetPixelsByColor(puzzle: PuzzleDefinition) {
  const totals = new Uint32Array(puzzle.palette.length);

  for (const colorIndex of puzzle.targetPixels) {
    totals[colorIndex] += 1;
  }

  return totals;
}

export function createProgressSummary(
  puzzle: PuzzleDefinition,
  progress: PuzzleProgress,
  totalByColor = countTargetPixelsByColor(puzzle)
) {
  return {
    paintedByColor: Array.from(progress.paintedByColor),
    paintedCount: progress.paintedCount,
    totalByColor: Array.from(totalByColor),
    totalPixels: puzzle.width * puzzle.height,
  };
}
