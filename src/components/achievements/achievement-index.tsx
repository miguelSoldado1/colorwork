import { getAchievementProgress } from "@/achievements/evaluate-achievements";
import Sparkle from "@/assets/icons/sparkle.svg?react";
import type { AchievementDefinition } from "@/achievements/achievement-catalog";
import type { AchievementState } from "@/achievements/process-achievements";

const UNLOCK_DATE = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const GRID = "grid gap-3 sm:gap-4";
const CARD = "flex min-w-0 gap-3.5 rounded-xl border border-border p-4 sm:p-5";

interface AchievementIndexProps {
  achievements: readonly AchievementDefinition[];
  state: AchievementState;
}

export function AchievementIndex({ achievements, state }: AchievementIndexProps) {
  return (
    // Catalog order. A card stays where the player last saw it and only changes state.
    <ol className={GRID}>
      {achievements.map((achievement) => (
        <AchievementCard achievement={achievement} key={achievement.id} state={state} />
      ))}
    </ol>
  );
}

interface AchievementCardProps {
  achievement: AchievementDefinition;
  state: AchievementState;
}

function AchievementCard({ achievement, state }: AchievementCardProps) {
  const unlock = state.unlockedAchievements.get(achievement.id);
  const progress = getAchievementProgress(achievement, state.metricValues);
  const unlockedAt = unlock ? new Date(unlock.unlockedAt) : undefined;

  return (
    <li className={`${CARD} ${unlock ? "bg-card/60" : "bg-card/25"}`}>
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-sm border ${
          unlock ? "border-primary/35 bg-primary/12 text-primary" : "border-border bg-muted/40 text-muted-foreground"
        }`}
      >
        <Sparkle aria-hidden height={24} width={24} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* From sm the date takes the far edge. A full-width card has the room; a phone does not. */}
        <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h2 className={`min-w-0 font-semibold text-[15px] leading-tight ${unlock ? "" : "text-muted-foreground"}`}>
            {achievement.name}
          </h2>

          {/* Same sage micro-caps as the toast's label, in the same place under the name. */}
          {unlockedAt ? (
            <time
              className="shrink-0 text-[10px] text-primary uppercase tabular-nums leading-none tracking-[0.16em]"
              dateTime={unlockedAt.toISOString()}
            >
              {UNLOCK_DATE.format(unlockedAt)}
            </time>
          ) : null}
        </div>

        <p className="mt-1.5 text-muted-foreground text-xs leading-5">{achievement.description}</p>

        {/* Unconditional on purpose. A finished achievement should read as a full bar. */}
        <div className="mt-3.5 flex items-center gap-3">
          <div
            aria-label={`${achievement.name} progress`}
            aria-valuemax={progress.target}
            aria-valuemin={0}
            aria-valuenow={progress.current}
            aria-valuetext={`${progress.current} of ${progress.target}`}
            className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-foreground/10"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${(progress.current / progress.target) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {progress.current} / {progress.target}
          </span>
        </div>
      </div>
    </li>
  );
}

// The cards the grid will hold, at the size it will hold them. Nothing shifts when the read lands.
export function AchievementIndexSkeleton({ achievements }: { achievements: readonly AchievementDefinition[] }) {
  return (
    <div aria-hidden className={`${GRID} animate-pulse motion-reduce:animate-none`}>
      {achievements.map(({ id }) => (
        <div className={`${CARD} bg-card/25`} key={id}>
          <span className="size-10 shrink-0 rounded-sm bg-foreground/8" />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="flex h-5 items-center">
              <span className="h-3 w-28 rounded-sm bg-foreground/10" />
            </span>
            <span className="mt-1.5 flex h-5 items-center">
              <span className="h-3 w-full rounded-sm bg-foreground/6" />
            </span>
            <span className="flex h-5 items-center">
              <span className="h-3 w-2/3 rounded-sm bg-foreground/6" />
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
