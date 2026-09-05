import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import ArrowRight from "@/assets/icons/arrow-right.svg?react";
import Sparkle from "@/assets/icons/sparkle.svg?react";
import { tryCatch } from "@/try-catch";
import { runAchievementCheck } from "./run-achievement-check";
import type { CSSProperties, MouseEvent } from "react";
import type { AchievementCheck } from "./run-achievement-check";

export interface AchievementToastDetails {
  description: string;
  id: string;
  name: string;
}

// An unlock is read, not acted on, so it stays longer than a confirmation would.
const DURATION = 6000;

// Roughly a thumb's wobble: below this a press is a tap, above it the player meant to swipe.
const TAP_SLOP = 8;

export function checkAndShowAchievementUnlocks(check: AchievementCheck) {
  tryCatch(showAchievementUnlocks(check)).then((result) => {
    if (result.error) {
      console.error("[achievements] Achievement toasts could not be shown.", result.error);
    }
  });
}

async function showAchievementUnlocks(check: AchievementCheck) {
  const achievements = await runAchievementCheck(check);

  for (const achievement of achievements) {
    showAchievementToast(achievement);
  }
}

export function showAchievementToast({ description, id: achievementId, name }: AchievementToastDetails) {
  let pressOrigin: { x: number; y: number } | null = null;

  function followLink(event: MouseEvent<HTMLAnchorElement>) {
    const dragged =
      event.detail !== 0 &&
      pressOrigin !== null &&
      Math.hypot(event.clientX - pressOrigin.x, event.clientY - pressOrigin.y) > TAP_SLOP;

    pressOrigin = null;

    // A swipe ends in a click too, and a dismissed toast should not also navigate.
    if (dragged) {
      event.preventDefault();
      return;
    }

    toast.dismiss(id);
  }

  const id = toast(
    <Link
      className="group flex min-w-0 select-none items-start gap-3 after:absolute after:inset-0 focus-visible:outline-none"
      // A native link drag would preempt Sonner's swipe, so the card stays draggable only by Sonner.
      draggable={false}
      hash={`achievement-${achievementId}`}
      hashScrollIntoView={false}
      onClick={followLink}
      onPointerDown={(event) => {
        pressOrigin = { x: event.clientX, y: event.clientY };
      }}
      to="/achievements"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-sm border border-primary/35 bg-primary/12 text-primary">
        <Sparkle height={24} width={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] text-primary uppercase leading-none tracking-[0.18em]">Achievement unlocked</span>
        <span className="mt-1.5 font-semibold text-[15px] leading-tight">{name}</span>
        <span className="mt-1 text-muted-foreground text-xs leading-snug">{description}</span>
      </span>
      {/* Drawn on fours so an exact halving of the 24px grid lands on whole pixels at 12. */}
      <ArrowRight
        className="mt-3.5 shrink-0 text-muted-foreground transition-colors duration-200 ease-out group-hover:text-foreground"
        height={12}
        width={12}
      />
      <span className="sr-only">View this achievement</span>
      <span
        aria-hidden
        className="achievement-toast-timer absolute inset-x-0 bottom-0 h-px origin-left bg-primary/50"
      />
    </Link>,
    {
      className: "achievement-toast",
      duration: DURATION,
      style: { "--achievement-toast-duration": `${DURATION}ms` } as CSSProperties,
    }
  );

  return id;
}
