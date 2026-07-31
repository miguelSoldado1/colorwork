import { LEVELS } from "./level-catalog";
import type { PuzzleDefinition } from "@/coloring/types";

export interface LevelDescription {
  /** How many palette colors have no cells left. */
  completedColors: number;
  finished: boolean;
  /** Per palette index: true once that color has no cells left. */
  finishedColors: readonly boolean[];
  paintedCount: number;
  /** Rounded whole percent, for the meter only. Counts decide whether something is finished. */
  percent: number;
  puzzle: PuzzleDefinition;
  started: boolean;
  totalPixels: number;
}

export const MENU_LEVELS: readonly LevelDescription[] = LEVELS.map(describeLevel);

/** Replace these zeroes with stored progress once persistence is available. */
export function describeLevel(puzzle: PuzzleDefinition): LevelDescription {
  return {
    completedColors: 0,
    finished: false,
    finishedColors: puzzle.palette.map(() => false),
    paintedCount: 0,
    percent: 0,
    puzzle,
    started: false,
    totalPixels: puzzle.width * puzzle.height,
  };
}
