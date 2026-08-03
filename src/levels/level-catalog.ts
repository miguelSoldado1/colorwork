import type { PuzzleDefinition } from "@/coloring/types";

const puzzleModules = import.meta.glob<PuzzleDefinition>(["../puzzles/*.ts", "!../puzzles/decode-pixels.ts"], {
  eager: true,
  import: "default",
});

export const LEVELS: readonly PuzzleDefinition[] = Object.values(puzzleModules).sort(compareLevels);

export function findLevel(id: string) {
  return LEVELS.find((puzzle) => puzzle.id === id);
}

function compareLevels(first: PuzzleDefinition, second: PuzzleDefinition) {
  const firstOrder = first.catalogOrder ?? Number.MAX_SAFE_INTEGER;
  const secondOrder = second.catalogOrder ?? Number.MAX_SAFE_INTEGER;

  return firstOrder - secondOrder || first.id.localeCompare(second.id);
}
