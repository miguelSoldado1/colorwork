import { countTargetPixelsByColor } from "@/coloring/progress";
import type { PuzzleDefinition, PuzzleProgress } from "@/coloring/types";

export type LevelSource = "catalog" | "imported";

const NEW_ARTWORK_DURATION = 7 * 24 * 60 * 60 * 1000;

export interface LevelDescription {
  completedColors: number;
  finished: boolean;
  finishedColors: readonly boolean[];
  isNew: boolean;
  paintedCount: number;
  percent: number;
  puzzle: PuzzleDefinition;
  source: LevelSource;
  started: boolean;
  totalPixels: number;
}

export function describeLevel(
  puzzle: PuzzleDefinition,
  progress: PuzzleProgress | undefined,
  source: LevelSource
): LevelDescription {
  const totalByColor = countTargetPixelsByColor(puzzle);
  const paintedCount = progress?.paintedCount ?? 0;
  const finishedColors = Array.from(totalByColor, (total, colorIndex) => {
    const painted = progress?.paintedByColor[colorIndex] ?? 0;
    return total > 0 && painted >= total;
  });
  const totalPixels = puzzle.width * puzzle.height;
  const started = paintedCount > 0;
  const recentlyAdded = puzzle.addedOn !== undefined && Date.now() - Date.parse(puzzle.addedOn) < NEW_ARTWORK_DURATION;

  return {
    completedColors: finishedColors.filter(Boolean).length,
    finished: totalPixels > 0 && paintedCount >= totalPixels,
    finishedColors,
    isNew: recentlyAdded && !started,
    paintedCount,
    percent: totalPixels === 0 ? 0 : Math.round((paintedCount / totalPixels) * 100),
    puzzle,
    source,
    started,
    totalPixels,
  };
}
