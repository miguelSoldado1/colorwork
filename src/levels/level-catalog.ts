import { napoleonDynamitePuzzle } from "@/puzzles/napoleon-dynamite-puzzle";
import type { PuzzleDefinition } from "@/coloring/types";

export const LEVELS: readonly PuzzleDefinition[] = [napoleonDynamitePuzzle];

export function findLevel(id: string) {
  return LEVELS.find((puzzle) => puzzle.id === id);
}
