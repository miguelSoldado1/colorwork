import type { ProgressSummary } from "@/coloring/types";

interface ProgressDisplayProps {
  summary: ProgressSummary;
}

export function ProgressDisplay({ summary }: ProgressDisplayProps) {
  const ratio = summary.totalPixels === 0 ? 0 : summary.paintedCount / summary.totalPixels;
  const paintedCount = summary.paintedCount.toLocaleString();
  const totalPixels = summary.totalPixels.toLocaleString();

  return (
    <div
      aria-label={`${paintedCount} of ${totalPixels} pixels painted`}
      className="flex min-w-0 items-center gap-3"
      role="status"
    >
      <div className="h-1 min-w-10 flex-1 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      {/* One number, sized to the space: the ratio on phones, the raw count on desktop. */}
      <span className="shrink-0 text-muted-foreground text-xs tabular-nums sm:hidden">{Math.round(ratio * 100)}%</span>
      <span className="hidden shrink-0 text-muted-foreground text-sm tabular-nums sm:inline">
        {paintedCount} / {totalPixels}
      </span>
    </div>
  );
}
