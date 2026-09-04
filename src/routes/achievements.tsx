import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { ACHIEVEMENTS } from "@/achievements/achievement-catalog";
import { subscribeToStoredAchievements } from "@/achievements/achievement-storage";
import { getAchievementProgress } from "@/achievements/evaluate-achievements";
import ArrowLeft from "@/assets/icons/arrow-left.svg?react";
import Sparkle from "@/assets/icons/sparkle.svg?react";
import { achievementQueryKeys, achievementStateQueryOptions } from "@/query/achievement-queries";
import { usePageMetadata } from "@/seo/use-page-metadata";
import type { ReactNode } from "react";
import type { AchievementDefinition } from "@/achievements/achievement-catalog";
import type { AchievementState } from "@/achievements/process-achievements";

const UNLOCK_DATE = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

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

  if (achievementsQuery.isPending) {
    return (
      <AchievementsFrame>
        <div className="grid min-h-48 place-items-center text-muted-foreground text-sm" role="status">
          Loading achievements…
        </div>
      </AchievementsFrame>
    );
  }

  if (achievementsQuery.isError) {
    return <AchievementLoadError onRetry={retry} />;
  }

  return <AchievementCollection state={achievementsQuery.data} />;

  async function retry() {
    await achievementsQuery.refetch();
  }
}

function AchievementCollection({ state }: { state: AchievementState }) {
  const unlockedCount = ACHIEVEMENTS.filter(({ id }) => state.unlockedAchievements.has(id)).length;

  return (
    <AchievementsFrame>
      <header className="border-border border-b pb-6 sm:pb-8">
        <p className="text-[10px] text-primary uppercase tracking-[0.2em]">Achievements</p>
        <h1 className="mt-1 font-semibold text-3xl leading-none sm:text-5xl">
          {unlockedCount} of {ACHIEVEMENTS.length} unlocked
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground text-sm leading-6">
          Finish artworks and build your collection. Each achievement is saved in this browser when you earn it.
        </p>
      </header>

      <ol className="mt-6 grid gap-3 sm:mt-8">
        {ACHIEVEMENTS.map((achievement) => (
          <AchievementRow achievement={achievement} key={achievement.id} state={state} />
        ))}
      </ol>
    </AchievementsFrame>
  );
}

function AchievementRow({ achievement, state }: { achievement: AchievementDefinition; state: AchievementState }) {
  const unlock = state.unlockedAchievements.get(achievement.id);
  const progress = getAchievementProgress(achievement, state.metricValues);
  const progressPercent = (progress.current / progress.target) * 100;

  return (
    <li className="rounded-xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="flex min-w-0 items-start gap-4">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-sm border ${
            unlock ? "border-primary/35 bg-primary/12 text-primary" : "border-border bg-muted/60 text-muted-foreground"
          }`}
        >
          <Sparkle aria-hidden height={24} width={24} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-semibold text-base leading-tight">{achievement.name}</h2>
            <p
              className={`text-[10px] uppercase tracking-[0.16em] ${unlock ? "text-primary" : "text-muted-foreground"}`}
            >
              {unlock ? `Unlocked ${UNLOCK_DATE.format(unlock.unlockedAt)}` : "In progress"}
            </p>
          </div>
          <p className="mt-1.5 text-muted-foreground text-sm leading-5">{achievement.description}</p>

          <div className="mt-4 flex items-center gap-3">
            <div
              aria-label={`${achievement.name} progress`}
              aria-valuemax={progress.target}
              aria-valuemin={0}
              aria-valuenow={progress.current}
              className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
            >
              <div
                className="h-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
              {progress.current} / {progress.target}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}

function AchievementLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <AchievementsFrame>
      <div className="grid min-h-48 place-items-center rounded-xl border border-border p-6 text-center" role="alert">
        <div>
          <p className="font-medium text-sm">Couldn&apos;t load your achievements</p>
          <p className="mt-1 text-muted-foreground text-xs">
            The achievement history in this browser couldn&apos;t be opened.
          </p>
          <button
            className="mt-4 min-h-11 rounded-md border border-border px-4 text-sm transition-colors hover:bg-foreground/4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        </div>
      </div>
    </AchievementsFrame>
  );
}

function AchievementsFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-svh px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <article className="mx-auto max-w-3xl">
        <Link
          className="-mx-1 mb-5 inline-flex min-h-11 items-center gap-1.5 rounded px-1 text-[10px] text-muted-foreground uppercase tracking-[0.24em] transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          to="/"
        >
          <ArrowLeft aria-hidden height={13} width={13} />
          All artworks
        </Link>
        {children}
      </article>
    </main>
  );
}
