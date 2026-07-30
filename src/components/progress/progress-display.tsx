import type { ProgressSummary } from "@/coloring/types";

interface ProgressDisplayProps {
  summary: ProgressSummary;
}

export function ProgressDisplay({ summary }: ProgressDisplayProps) {
  const progressWidth = summary.totalPixels === 0 ? 0 : (summary.paintedCount / summary.totalPixels) * 100;
  const paintedCount = summary.paintedCount.toLocaleString();
  const totalPixels = summary.totalPixels.toLocaleString();

  return (
    <div
      aria-label={`${paintedCount} of ${totalPixels} pixels painted`}
      className="flex min-w-0 items-center gap-2 sm:gap-3"
      role="status"
    >
      <div className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${progressWidth}%` }}
        />
      </div>
      <span className="shrink-0 text-right text-foreground text-xs tabular-nums sm:text-sm">
        {paintedCount} / {totalPixels}
      </span>
    </div>
  );
}
