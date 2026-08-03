import type { PuzzleDefinition } from "@/coloring/types";

const puzzleModules = import.meta.glob<PuzzleDefinition>(["../puzzles/*.ts", "!../puzzles/decode-pixels.ts"], {
  eager: true,
  import: "default",
});

export const LEVELS: readonly PuzzleDefinition[] = Object.values(puzzleModules).sort((first, second) =>
  first.id.localeCompare(second.id)
);

export function findLevel(id: string) {
  return LEVELS.find((puzzle) => puzzle.id === id);
}
