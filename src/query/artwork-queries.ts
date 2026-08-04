import { queryOptions } from "@tanstack/react-query";
import { createPuzzleProgress } from "@/coloring/progress";
import { loadPuzzleProgress } from "@/coloring/progress-storage";
import { describeLevel } from "@/levels/describe-level";
import { LEVELS } from "@/levels/level-catalog";
import type { PuzzleDefinition } from "@/coloring/types";

export const artworkQueryKeys = {
  all: ["artworks"] as const,
  descriptions: ["artworks", "descriptions"] as const,
  progress: (artworkId: string) => ["artworks", artworkId, "progress"] as const,
};

export function artworkDescriptionsQueryOptions() {
  return queryOptions({
    queryFn: loadArtworkDescriptions,
    queryKey: artworkQueryKeys.descriptions,
  });
}

export function artworkProgressQueryOptions(puzzle: PuzzleDefinition) {
  return queryOptions({
    // The Canvas owns and mutates a clone, so this cached snapshot is intentionally route-scoped.
    gcTime: 0,
    queryFn: async () => (await loadPuzzleProgress(puzzle)) ?? createPuzzleProgress(puzzle),
    queryKey: artworkQueryKeys.progress(puzzle.id),
    staleTime: 0,
  });
}

async function loadArtworkDescriptions() {
  const progress = await Promise.all(LEVELS.map((puzzle) => loadPuzzleProgress(puzzle)));
  return LEVELS.map((puzzle, index) => describeLevel(puzzle, progress[index]));
}
