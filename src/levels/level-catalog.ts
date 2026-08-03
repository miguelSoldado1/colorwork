import { napoleonDynamitePuzzle } from "@/puzzles/napoleon-dynamite-puzzle";
import { pondPuzzle } from "@/puzzles/pond";
import type { PuzzleDefinition } from "@/coloring/types";

export const LEVELS: readonly PuzzleDefinition[] = [napoleonDynamitePuzzle, pondPuzzle];

export function findLevel(id: string) {
  return LEVELS.find((puzzle) => puzzle.id === id);
}
