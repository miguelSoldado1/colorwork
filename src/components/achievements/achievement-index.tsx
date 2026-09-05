import { useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
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
  const hash = useLocation({ select: (location) => location.hash });

  return (
    // Catalog order. A card stays where the player last saw it and only changes state.
    <ol className={GRID}>
      {achievements.map((achievement) => (
        <AchievementCard
          achievement={achievement}
          key={achievement.id}
          state={state}
          targeted={hash === `achievement-${achievement.id}`}
        />
      ))}
    </ol>
  );
}

interface AchievementCardProps {
  achievement: AchievementDefinition;
  state?: AchievementState;
  targeted?: boolean;
}

function AchievementCard({ achievement, state, targeted = false }: AchievementCardProps) {
  const cardRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (targeted) {
      cardRef.current?.scrollIntoView({ behavior: "instant", block: "center" });
      cardRef.current?.focus({ preventScroll: true });
    }
  }, [targeted]);
  const unlock = state?.unlockedAchievements.get(achievement.id);
  const progress = state
    ? getAchievementProgress(achievement, state.metricValues)
    : { current: 0, target: achievement.criteria.threshold };
  if (unlock) {
    progress.current = progress.target;
  }
  const titleTone = unlock ? "" : "text-muted-foreground";
  const remaining = progress.target - progress.current;
  const unit = achievement.criteria.metric === "stored-imported-puzzles" ? "import" : "artwork";
  const progressLabel = unlock
    ? `${progress.current} / ${progress.target}`
    : `${remaining} more ${unit}${remaining === 1 ? "" : "s"}`;
  const unlockedAt = unlock ? new Date(unlock.unlockedAt) : undefined;

  return (
    <li
      aria-labelledby={`achievement-title-${achievement.id}`}
      className={`${CARD} scroll-my-6 focus:outline-none ${unlock ? "bg-card/60" : "bg-card/25"}`}
      data-arrival={targeted || undefined}
      id={`achievement-${achievement.id}`}
      ref={cardRef}
      tabIndex={-1}
    >
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-sm border ${
          unlock ? "border-primary/35 bg-primary/12 text-primary" : "border-border bg-muted/40 text-muted-foreground"
        }`}
      >
        <Sparkle aria-hidden className={state ? undefined : "invisible"} height={24} width={24} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* From sm the date takes the far edge. A full-width card has the room; a phone does not. */}
        <div className="flex min-h-9 min-w-0 flex-col gap-1.5 sm:min-h-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <h2
            className={`min-w-0 font-semibold text-[15px] leading-tight ${titleTone}`}
            id={`achievement-title-${achievement.id}`}
          >
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
        <div
          aria-hidden={!state || undefined}
          className={`mt-3.5 flex items-center gap-3 ${state ? "" : "animate-pulse motion-reduce:animate-none"}`}
        >
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
          <span
            className={`shrink-0 text-xs tabular-nums ${state ? "text-muted-foreground" : "rounded-sm bg-foreground/6 text-transparent"}`}
          >
            {progressLabel}
          </span>
        </div>
      </div>
    </li>
  );
}

// Use the real copy and layout so wrapping reserves the same space before storage resolves.
export function AchievementIndexSkeleton({ achievements }: { achievements: readonly AchievementDefinition[] }) {
  return (
    <ol aria-label="Achievements" className={GRID} data-loading="true">
      {achievements.map((achievement) => (
        <AchievementCard achievement={achievement} key={achievement.id} />
      ))}
    </ol>
  );
}
