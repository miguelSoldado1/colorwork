import type { PuzzleDefinition } from "@/coloring/types";

/** Imported artwork is session-only until persistence is added. */
const importedPuzzles = new Map<string, PuzzleDefinition>();

export function rememberImportedPuzzle(puzzle: PuzzleDefinition) {
  importedPuzzles.set(puzzle.id, puzzle);
}

export function findImportedPuzzle(id: string) {
  return importedPuzzles.get(id);
}
