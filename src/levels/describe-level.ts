import { countTargetPixelsByColor } from "@/coloring/progress";
import { LEVELS } from "./level-catalog";
import type { PuzzleDefinition, PuzzleProgress } from "@/coloring/types";

export interface LevelDescription {
  completedColors: number;
  finished: boolean;
  finishedColors: readonly boolean[];
  paintedCount: number;
  percent: number;
  puzzle: PuzzleDefinition;
  started: boolean;
  totalPixels: number;
}

export const MENU_LEVELS: readonly LevelDescription[] = LEVELS.map((puzzle) => describeLevel(puzzle));

export function describeLevel(puzzle: PuzzleDefinition, progress?: PuzzleProgress): LevelDescription {
  const totalByColor = countTargetPixelsByColor(puzzle);
  const paintedCount = progress?.paintedCount ?? 0;
  const finishedColors = Array.from(totalByColor, (total, colorIndex) => {
    const painted = progress?.paintedByColor[colorIndex] ?? 0;
    return total > 0 && painted >= total;
  });
  const totalPixels = puzzle.width * puzzle.height;

  return {
    completedColors: finishedColors.filter(Boolean).length,
    finished: totalPixels > 0 && paintedCount >= totalPixels,
    finishedColors,
    paintedCount,
    percent: totalPixels === 0 ? 0 : Math.round((paintedCount / totalPixels) * 100),
    puzzle,
    started: paintedCount > 0,
    totalPixels,
  };
}
