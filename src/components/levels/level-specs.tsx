import { PaletteStrip } from "@/components/levels/palette-strip";
import type { ReactNode } from "react";
import type { LevelDescription } from "@/levels/describe-level";

interface LevelSpecsProps {
  level: LevelDescription;
}

export function LevelSpecs({ level }: LevelSpecsProps) {
  const { finishedColors, paintedCount, percent, puzzle, totalPixels } = level;

  return (
    <div>
      <dl className="flex flex-col gap-2.5 text-sm">
        <SpecRow label="Grid">
          {puzzle.width} × {puzzle.height}
        </SpecRow>
        <SpecRow label="Colors">
          <PaletteStrip className="justify-end" finishedColors={finishedColors} palette={puzzle.palette} />
        </SpecRow>
        <SpecRow label="Painted">
          {paintedCount.toLocaleString()} | {totalPixels.toLocaleString()}
        </SpecRow>
      </dl>
      <span aria-hidden className="mt-3 block h-0.5 overflow-hidden rounded-full bg-foreground/10">
        <span
          className="block h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </span>
    </div>
  );
}

function SpecRow({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}

export function describeLevelState({ completedColors, finished, puzzle, started }: LevelDescription) {
  if (finished) {
    return "Every cell painted.";
  }
  if (!started) {
    return `${puzzle.palette.length} colors, none started.`;
  }
  return `${completedColors} of ${puzzle.palette.length} colors finished.`;
}

export function paintActionLabel({ finished, started }: LevelDescription) {
  if (finished) {
    return "Paint it again";
  }
  return started ? "Keep painting" : "Start painting";
}
