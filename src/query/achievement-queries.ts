import { queryOptions } from "@tanstack/react-query";
import { reconcileAchievementState } from "@/achievements/process-achievements";
import { loadArtworkDescriptions } from "@/query/artwork-queries";

export const achievementQueryKeys = {
  all: ["achievements"] as const,
};

export function achievementStateQueryOptions() {
  return queryOptions({
    queryFn: async () => {
      const levels = await loadArtworkDescriptions();
      const completedPuzzles = levels
        .filter((level) => level.finished)
        .map((level) => ({ artworkId: level.puzzle.id, source: level.source }));

      return reconcileAchievementState(completedPuzzles);
    },
    queryKey: achievementQueryKeys.all,
    staleTime: 0,
  });
}
