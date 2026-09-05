import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { ACHIEVEMENTS } from "@/achievements/achievement-catalog";
import { subscribeToStoredAchievements } from "@/achievements/achievement-storage";
import { AchievementIndex, AchievementIndexSkeleton } from "@/components/achievements/achievement-index";
import { AchievementSummary } from "@/components/achievements/achievement-summary";
import { AchievementsFrame } from "@/components/achievements/achievements-frame";
import { ClearAchievementHistoryControl } from "@/components/debug/clear-achievement-history-control";
import { Button } from "@/components/ui/button";
import { isDebugMode } from "@/debug/debug-mode";
import { achievementQueryKeys, achievementStateQueryOptions } from "@/query/achievement-queries";
import { usePageMetadata } from "@/seo/use-page-metadata";

export const Route = createFileRoute("/achievements")({ component: AchievementsRoute });

function AchievementsRoute() {
  const queryClient = useQueryClient();
  const achievementsQuery = useQuery(achievementStateQueryOptions());

  usePageMetadata({
    description: "See every Colorwork achievement and your progress toward unlocking it.",
    path: "/achievements",
    title: "Achievements - Colorwork",
  });

  useEffect(
    () =>
      subscribeToStoredAchievements(async () => {
        await queryClient.invalidateQueries({ queryKey: achievementQueryKeys.all });
      }),
    [queryClient]
  );

  const state = achievementsQuery.data;

  return (
    <AchievementsFrame>
      {/* Held through every state. The page never rebuilds itself under the reader. */}
      <AchievementSummary
        achievements={ACHIEVEMENTS}
        action={isDebugMode ? <ClearAchievementHistoryControl /> : undefined}
        failed={!state && achievementsQuery.isError}
        unlockedIds={state ? new Set(state.unlockedAchievements.keys()) : undefined}
      />
      {renderCollection()}
    </AchievementsFrame>
  );

  function renderCollection() {
    if (state) {
      return <AchievementIndex achievements={ACHIEVEMENTS} state={state} />;
    }
    if (achievementsQuery.isError) {
      return <AchievementLoadError onRetry={retry} />;
    }
    return (
      <div>
        <span className="sr-only" role="status">
          Loading achievement progress
        </span>
        <AchievementIndexSkeleton achievements={ACHIEVEMENTS} />
      </div>
    );
  }

  async function retry() {
    await achievementsQuery.refetch();
  }
}

function AchievementLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-border px-4 py-6 sm:px-6" role="alert">
      <p className="text-sm">Couldn&apos;t read your achievements</p>
      <p className="mt-1.5 max-w-md text-muted-foreground text-xs leading-5">
        The unlock history stored in this browser couldn&apos;t be opened. Your artwork and progress are untouched.
      </p>
      <Button className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
