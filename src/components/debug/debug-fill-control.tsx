import { useRef, useState } from "react";
import { showAchievementToast } from "@/achievements/show-achievement-toast";
import {
  clonePuzzleProgress,
  createCompletedPuzzleProgress,
  createProgressSummary,
  createPuzzleProgress,
} from "@/coloring/progress";
import type { ProgressSummary, PuzzleDefinition, PuzzleProgress } from "@/coloring/types";

interface DebugFillControlProps {
  onProgress: (progress: PuzzleProgress) => void;
  onSummary: (summary: ProgressSummary) => void;
  progress: PuzzleProgress;
  puzzle: PuzzleDefinition;
}

export function DebugFillControl({ onProgress, onSummary, progress, puzzle }: DebugFillControlProps) {
  const progressBeforeFillRef = useRef<PuzzleProgress | null>(null);
  const [filled, setFilled] = useState(false);

  function toggleFill(fill: boolean) {
    const nextProgress = fill
      ? createCompletedPuzzleProgress(puzzle)
      : (progressBeforeFillRef.current ?? createPuzzleProgress(puzzle));

    progressBeforeFillRef.current = fill ? clonePuzzleProgress(progress) : null;
    onProgress(nextProgress);
    onSummary(createProgressSummary(puzzle, nextProgress));
    setFilled(fill);
  }

  function showToast() {
    showAchievementToast({
      description: "You finished your first artwork.",
      name: "First finish",
    });
  }

  return (
    <>
      <button
        aria-label="Show achievement toast for debugging"
        className="z-20 min-h-11 rounded-md border border-border bg-card px-3 text-muted-foreground text-xs opacity-70 transition-[color,background-color,border-color,transform,opacity] duration-150 ease-out hover:border-foreground/20 hover:bg-muted hover:text-foreground hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:translate-y-px"
        onClick={showToast}
        type="button"
      >
        Toast
      </button>
      <label className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 text-muted-foreground text-xs">
        <input
          aria-label="Fill canvas for debugging"
          checked={filled}
          className="shrink-0 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          onChange={(event) => toggleFill(event.target.checked)}
          type="checkbox"
        />
        <span className="hidden sm:inline">Fill canvas</span>
      </label>
    </>
  );
}
