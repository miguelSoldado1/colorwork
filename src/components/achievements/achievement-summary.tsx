import type { ReactNode } from "react";
import type { AchievementDefinition } from "@/achievements/achievement-catalog";

interface AchievementSummaryProps {
  achievements: readonly AchievementDefinition[];
  action?: ReactNode;
  failed: boolean;
  // Undefined until the stored history is read. The count is never guessed at.
  unlockedIds: ReadonlySet<string> | undefined;
}

export function AchievementSummary({ action, achievements, failed, unlockedIds }: AchievementSummaryProps) {
  const unlockedCount = unlockedIds ? achievements.filter(({ id }) => unlockedIds.has(id)).length : undefined;

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-border border-b pb-6 sm:pb-8">
      <div className="min-w-0">
        {renderLabel()}

        {/* A failed read has no honest count. The title falls back to the page's own name. */}
        {renderTitle()}

        <p className="mt-4 max-w-lg text-muted-foreground text-sm leading-6">
          Finish artworks and build a collection. Unlocks are saved in this browser.
        </p>
      </div>
      {action}
    </header>
  );

  function renderLabel() {
    return failed ? null : <p className="text-[10px] text-primary uppercase tracking-[0.2em]">Achievements</p>;
  }

  function renderTitle() {
    if (failed) {
      return <h1 className="font-semibold text-3xl leading-none sm:text-5xl">Achievements</h1>;
    }
    if (unlockedCount === undefined) {
      return (
        <div
          aria-hidden
          className="mt-1.5 h-7 w-48 animate-pulse rounded-sm bg-foreground/8 motion-reduce:animate-none sm:h-11 sm:w-80"
        />
      );
    }
    return (
      <h1 className="mt-1 font-semibold text-3xl leading-none sm:text-5xl">
        {unlockedCount} of {achievements.length} unlocked
      </h1>
    );
  }
}
